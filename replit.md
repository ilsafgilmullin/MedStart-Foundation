# MedStart 2.0

MedStart — маркетплейс медицинских репетиторов. Студенты самостоятельно выбирают специалистов, записываются на занятия и общаются с ними в едином кабинете.

## Команды

- `pnpm --filter @workspace/medstart dev` — запустить Next.js на порту 3000.
- `pnpm --filter @workspace/medstart typecheck` — проверить TypeScript.
- `pnpm --filter @workspace/medstart build` — собрать приложение.
- `pnpm run typecheck` — проверить все workspace-пакеты.
- `pnpm run build` — полная проверка и сборка workspace.

## Роли

- `student` — сразу получает активный аккаунт и доступ к каталогу.
- `tutor` — создаётся со статусом `pending`; публикация только после модерации.
- `admin` — модерирует пользователей и анкеты.
- `owner` — эффективная роль владельца, временно определяется по `NEXT_PUBLIC_OWNER_UID`; перед production переносится в Firebase custom claims.

## Основные маршруты

- `/` — публичная главная.
- `/login` — вход.
- `/register/student` — регистрация студента.
- `/register/tutor` — заявка репетитора.
- `/dashboard` — кабинет.
- `/dashboard/tutors` — каталог проверенных репетиторов.
- `/dashboard/schedule` — занятия.
- `/dashboard/messages` — сообщения.
- `/dashboard/profile` — профиль.
- `/dashboard/admin` — модерация для администратора и владельца.

## Firebase

Клиентская конфигурация задаётся переменными из `artifacts/medstart/.env.example`.

Правила безопасности находятся в `firestore.rules`. Клиент не может самостоятельно менять `role`, `status`, `isPublic`, `email`, `uid` и `createdAt`. Публично читаются только активные опубликованные репетиторы.

## Структура

```text
artifacts/medstart/
├── app/                    # Next.js App Router
├── components/dashboard/   # кабинет и навигация
├── hooks/                  # формы и auth hooks
├── lib/                    # Firebase, auth, Firestore, модели
├── providers/              # AuthProvider
└── messages/               # русские строки интерфейса
```

## Запрещено возвращать

- роль или маршрут `teacher`;
- фиктивную статистику, курсы и сертификаты;
- `.next`, `node_modules`, `.env`, ZIP и резервные копии в Git;
- выдачу `owner` или `admin` через клиентскую регистрацию.
