import { readFile, writeFile } from 'node:fs/promises'

const FIRESTORE_MARKER = '// MEDSTART_V6_MEDICAL_WORKSPACE_RULES'
const STORAGE_MARKER = '// MEDSTART_V6_MEDICAL_STORAGE_RULES'

const firestoreBlock = `
    ${FIRESTORE_MARKER}
    function validMedicalWorkspace(data, bookingId) {
      return data.keys().hasOnly([
          'bookingId',
          'clinicalCase',
          'labs',
          'ecg',
          'privacy',
          'boardBackground',
          'updatedByUid',
          'createdAt',
          'updatedAt'
        ])
        && data.bookingId == bookingId
        && data.clinicalCase is map
        && data.labs is list
        && data.labs.size() <= 100
        && data.ecg is map
        && data.privacy is map
        && data.boardBackground is map
        && data.updatedByUid == request.auth.uid
        && data.createdAt is timestamp
        && data.updatedAt is timestamp;
    }

    function validMedicalAsset(data, bookingId, assetId) {
      return data.keys().hasOnly([
          'id',
          'bookingId',
          'uploaderUid',
          'uploaderName',
          'modality',
          'storagePath',
          'fileName',
          'mimeType',
          'fileSize',
          'deidentified',
          'createdAt'
        ])
        && data.id == assetId
        && data.bookingId == bookingId
        && data.uploaderUid == request.auth.uid
        && data.uploaderName is string
        && data.uploaderName.size() <= 160
        && data.modality in ['xray', 'ct', 'mri', 'ultrasound', 'ecg', 'other']
        && data.storagePath is string
        && data.storagePath.matches(
          'medical-workspaces/'
            + bookingId
            + '/'
            + request.auth.uid
            + '/.+'
        )
        && data.fileName is string
        && data.fileName.size() > 0
        && data.fileName.size() <= 160
        && data.mimeType in [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/dicom'
        ]
        && data.fileSize is int
        && data.fileSize > 0
        && data.fileSize <= 20 * 1024 * 1024
        && data.deidentified == true
        && data.createdAt is timestamp;
    }

    match /medicalWorkspaces/{bookingId} {
      allow read: if canReadWhiteboard(bookingId);
      allow create, update: if canWriteWhiteboard(bookingId)
        && validMedicalWorkspace(request.resource.data, bookingId);
      allow delete: if isOwner();

      match /assets/{assetId} {
        allow read: if canReadWhiteboard(bookingId);
        allow create: if canWriteWhiteboard(bookingId)
          && validMedicalAsset(request.resource.data, bookingId, assetId);
        allow update: if false;
        allow delete: if isOwner()
          || (
            canWriteWhiteboard(bookingId)
            && (
              resource.data.uploaderUid == request.auth.uid
              || isWhiteboardTutor(bookingId)
            )
          );
      }
    }
`

const storageBlock = `
    ${STORAGE_MARKER}
    function medicalBooking(bookingId) {
      return firestore.get(
        /databases/(default)/documents/bookings/$(bookingId)
      ).data;
    }

    function canReadMedicalAsset(bookingId) {
      return signedIn()
        && medicalBooking(bookingId).status in ['accepted', 'completed']
        && (
          medicalBooking(bookingId).studentUid == request.auth.uid
          || medicalBooking(bookingId).tutorUid == request.auth.uid
          || isModerator()
        );
    }

    function canWriteMedicalAsset(bookingId) {
      return signedIn()
        && medicalBooking(bookingId).status == 'accepted'
        && (
          medicalBooking(bookingId).studentUid == request.auth.uid
          || medicalBooking(bookingId).tutorUid == request.auth.uid
        );
    }

    match /medical-workspaces/{bookingId}/{userId}/{fileName} {
      allow read: if canReadMedicalAsset(bookingId);

      allow create: if canWriteMedicalAsset(bookingId)
        && request.auth.uid == userId
        && request.resource.size > 0
        && request.resource.size <= 20 * 1024 * 1024
        && request.resource.metadata.bookingId == bookingId
        && request.resource.metadata.uploaderUid == request.auth.uid
        && request.resource.metadata.deidentified == 'true'
        && request.resource.metadata.educationalUseOnly == 'true'
        && (
          request.resource.contentType.matches('image/(jpeg|png|webp)')
          || (
            fileName.matches('.+[.]dcm')
            && request.resource.contentType in [
              'application/dicom',
              'application/octet-stream'
            ]
          )
        );

      allow update: if false;

      allow delete: if signedIn()
        && (
          request.auth.uid == userId
          || medicalBooking(bookingId).tutorUid == request.auth.uid
          || isModerator()
        );
    }
`

async function insertRules(path, marker, block) {
  const source = await readFile(path, 'utf8')
  if (source.includes(marker)) return false
  const serviceEnd = source.lastIndexOf('  }\n}')
  if (serviceEnd < 0) {
    throw new Error(`Не найден конец service-блока в ${path}`)
  }
  const next = `${source.slice(0, serviceEnd)}${block}${source.slice(serviceEnd)}`
  await writeFile(path, next, 'utf8')
  return true
}

const firestoreChanged = await insertRules(
  'firestore.rules',
  FIRESTORE_MARKER,
  firestoreBlock,
)
const storageChanged = await insertRules(
  'storage.rules',
  STORAGE_MARKER,
  storageBlock,
)

if (firestoreChanged || storageChanged) {
  console.log('MedStart v6: правила Firebase подготовлены.')
} else {
  console.log('MedStart v6: правила Firebase уже актуальны.')
}
