# MedStart

Маркетплейс медицинских репетиторов с собственным онлайн-занятием MedStart
Live, совместной умной доской, проверяемой учебной материальной базой,
Next.js 15, React 19, Tailwind CSS 4, Firebase и self-hosted LiveKit.

## Запуск

Кнопка **Run** запускает:

```bash
pnpm --filter @workspace/medstart dev
```

Проверка перед публикацией:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

## Структура

```text
artifacts/medstart/
├── app/
│   ├── dashboard/
│   │   ├── admin/
│   │   ├── knowledge/
│   │   ├── materials/
│   │   ├── messages/
│   │   ├── profile/
│   │   ├── requests/
│   │   ├── schedule/
│   │   ├── settings/
│   │   ├── students/
│   │   └── tutors/
│   ├── lesson/[bookingId]/
│   ├── api/livekit/token/
│   ├── login/
│   └── register/
├── components/dashboard/
├── components/live/
├── hooks/
├── lib/
│   └── server/
└── providers/

infra/livekit/
firestore.rules
firestore.indexes.json
storage.rules
firebase.json
```

## Firebase

Конфигурация веб-приложения берётся из `NEXT_PUBLIC_FIREBASE_*`. Для стабильной
сборки Replit предусмотрена безопасная резервная публичная web-конфигурация
проекта `medstart-e9bfe`.

После замены исходников обязательно опубликовать правила:

```bash
npx firebase-tools deploy --only firestore,storage
```

Подробности находятся в `FIREBASE_SETUP.md`.

## MedStart Live

Клиент видеозанятия и защищённая выдача токенов уже реализованы. Для реального
подключения комнаты нужны серверные Secrets LiveKit и Firebase Admin.

Инструкции:

- `LIVE_LESSON_SETUP.md` — подключение и контрольный тест;
- `ARCHITECTURE_RU_RESILIENCE.md` — целевая российская инфраструктура,
  резервирование и план миграции;
- `infra/livekit/` — безопасный шаблон self-hosted SFU/TURN.

## Учебная база

- `LEARNING_BASE_SETUP.md` — уровни доверия, официальные источники, правила
  публикации, модерации и безопасности файлов;
- `REPLIT_V5_UPDATE.md` — порядок обновления проекта и контрольный сценарий.

## Архитектурные ограничения

- использовать только термины `tutor` / «репетитор»;
- владелец не хранится как Firestore-роль;
- непроверенный репетитор не виден в каталоге;
- не возвращать LMS-курсы, тесты, сертификаты и фиктивный прогресс;
- интерфейс должен оставаться рабочим и на ПК, и на телефоне;
- сердце продукта — MedStart Live и совместная умная доска;
- видеокомната не должна открывать Zoom или другой внешний сервис;
- материал репетитора не может получать отметку «Официальный источник»;
- публикации репетиторов не видны студентам до ручной модерации;
- не добавлять демонстрационные данные в production-контур.
