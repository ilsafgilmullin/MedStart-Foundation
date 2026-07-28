import { readFile } from 'node:fs/promises'

const sources = {
  messenger: await readFile('artifacts/medstart/components/messages/MedicalMessenger.tsx', 'utf8'),
  capture: await readFile('artifacts/medstart/components/messages/MediaCaptureDialog.tsx', 'utf8'),
  bubble: await readFile('artifacts/medstart/components/messages/MessageBubble.tsx', 'utf8'),
  media: await readFile('artifacts/medstart/lib/chat-media.ts', 'utf8'),
  conversations: await readFile('artifacts/medstart/lib/conversations.ts', 'utf8'),
  action: await readFile('artifacts/medstart/app/api/messages/action/route.ts', 'utf8'),
}

const failures = []

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) failures.push(label)
}

function forbidMarker(source, marker, label) {
  if (source.includes(marker)) failures.push(label)
}

requireMarker(sources.messenger, 'messageScrollRef', 'Chat must scroll its own message pane')
requireMarker(sources.messenger, 'overflow-x-hidden', 'Chat viewport must prevent horizontal overflow')
requireMarker(sources.messenger, 'min-w-0 max-w-full', 'Central chat panel must be width-bounded')
requireMarker(sources.messenger, 'overscroll-contain', 'Message scroll must not move the whole page')
forbidMarker(sources.messenger, 'bottomRef.current?.scrollIntoView', 'Chat must not scroll the document')

requireMarker(sources.capture, 'videoBitsPerSecond = 450_000', 'Video notes must use a mobile-safe bitrate')
requireMarker(sources.capture, 'width: { ideal: 360, max: 480 }', 'Video notes must use a mobile-safe resolution')
requireMarker(sources.capture, 'frameRate: { ideal: 12, max: 18 }', 'Video notes must limit frame rate')
requireMarker(sources.capture, "recorder.start(1_000)", 'Recorder must avoid excessive chunks')

requireMarker(sources.media, 'request.timeout = 90_000', 'Media upload must have a timeout')
requireMarker(sources.media, 'fetchWithTimeout', 'Protected media reads must have a timeout')
requireMarker(sources.media, 'Проверьте интернет и повторите действие', 'Safari network errors must be user-friendly')

requireMarker(sources.conversations, 'requestId: newRequestId()', 'Message retry must use an idempotency key')
requireMarker(sources.conversations, 'MessageNetworkError', 'Message API must distinguish network failures')
requireMarker(sources.action, "collection('messages').doc(requestId)", 'Server must deduplicate retried messages')
requireMarker(sources.action, 'baseMime(input.claimedType)', 'Server must normalize recorder MIME types')

requireMarker(sources.bubble, '[overflow-wrap:anywhere]', 'Long messages must wrap on mobile')
requireMarker(sources.bubble, 'calc(100vw-96px)', 'Native audio controls must fit the phone viewport')

if (failures.length) {
  throw new Error(`Mobile messenger invariants failed:\n${failures.join('\n')}`)
}

console.log('Mobile messenger invariants passed.')
