# MedStart — production release checklist

Этот файл фиксирует только действия владельца/инфраструктуры. Кодовые проверки выполняются CI. Не помещайте реальные ключи, токены или service-account JSON в Git.

## 1. GitHub release governance

До merge PR в `main`:

- включить branch protection/ruleset для `main`;
- запретить force-push и удаление `main`;
- требовать Pull Request перед изменением `main`;
- требовать прохождение всех обязательных MedStart checks из PR;
- по возможности требовать подтверждение production environment перед deployment jobs;
- не разрешать прямой Firebase production deploy из feature-веток.

Репозиторий сейчас может оставаться публичным только как осознанное решение. Безопасность приложения не должна зависеть от скрытия исходного кода. Если код является закрытой интеллектуальной собственностью, отдельно переведите репозиторий в private до коммерческого запуска.

## 2. Production environment variables and secrets

Настройте реальные значения только в защищённом окружении приложения/секрет-хранилище:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON` либо полный набор `FIREBASE_ADMIN_*`
- `MEDSTART_RATE_LIMIT_PEPPER` — случайный server-only secret не короче 32 байт
- `MEDSTART_TRUST_PROXY_HEADERS=false` до доказанной конфигурации доверенного reverse proxy

Не включайте школьный контур в production до отдельной product/legal/privacy-проработки:

- `MEDSTART_SCHOOL_TRACK_ENABLED=false`
- `NEXT_PUBLIC_MEDSTART_SCHOOL_TRACK_ENABLED=false`

## 3. Firebase App Check

1. Зарегистрировать web-приложение MedStart в Firebase App Check с reCAPTCHA Enterprise.
2. Добавить публичный site key как `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`.
3. Первый выпуск выполнить с `MEDSTART_APP_CHECK_ENFORCEMENT_ENABLED=false`.
4. Проверить в Firebase App Check metrics, что реальные iPhone/Android/desktop клиенты получают valid tokens.
5. После подтверждения трафика включить App Check enforcement для используемых Firebase Authentication, Firestore и Storage сервисов.
6. Одновременно переключить `MEDSTART_APP_CHECK_ENFORCEMENT_ENABLED=true`, чтобы MedStart login/register/password-reset API также требовали валидную аттестацию.
7. После включения повторно проверить вход, регистрацию, сброс пароля и восстановление сессии на реальных устройствах.

Не включайте enforcement до выпуска клиента с корректным site key: это может заблокировать легитимных пользователей.

## 4. Dedicated read-only production audit credential

Создайте отдельный service account только для read-only production readiness audit. Он должен иметь лишь права, необходимые для:

- чтения Firebase Authentication user state;
- чтения Firestore production metadata/documents, проверяемых audit script;
- без прав записи/удаления пользователей, Firestore, Storage, Rules или indexes.

Сохраните JSON этого отдельного аккаунта в GitHub `production` environment как secret:

`FIREBASE_READ_ONLY_SERVICE_ACCOUNT_JSON`

Не подставляйте сюда основной административный service account приложения.

## 5. Firestore operational policies

- включить TTL policy для `securityRateLimits.expiresAt`;
- включить production backup policy и согласовать retention;
- при необходимости включить Point-in-Time Recovery;
- выполнить отдельный тест восстановления в непроизводственное окружение;
- настроить monitoring/alerts на ошибки Authentication, Firestore, Storage и backend/API.

## 6. Malware scanner for learning PDFs

До разрешения production PDF uploads:

- развернуть актуальный `clamd` в private network/localhost;
- не публиковать TCP 3310 в интернет;
- настроить `MEDSTART_CLAMAV_HOST`, `MEDSTART_CLAMAV_PORT`, `MEDSTART_CLAMAV_TIMEOUT_MS`;
- обеспечить регулярное обновление сигнатур ClamAV;
- проверить clean PDF, EICAR test file и сценарий недоступного scanner;
- при недоступном scanner публикация должна оставаться fail-closed.

## 7. Live video infrastructure

До включения реального видео:

- развернуть собственный LiveKit/SFU;
- настроить доступный TURN с TLS/TCP и UDP там, где это разрешено инфраструктурой;
- задать `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` только в server secrets;
- после фактической проверки включить `MEDSTART_LIVE_VIDEO_ENABLED=true`;
- провести TURN-only, reconnect, background/foreground и смену сети Wi-Fi/LTE тесты.

Работу без VPN, при блокировках или сильном глушении нельзя считать подтверждённой до реальных испытаний на целевых российских сетях.

## 8. Privileged-account MFA

Перед открытым production отдельно принять решение по MFA для owner/admin/moderator. Не внедряйте самодельный TOTP поверх текущего login flow. Если используется Firebase MFA/Identity Platform, сначала подготовьте и протестируйте совместимый enrollment/sign-in/recovery flow для текущей серверной схемы авторизации.

## 9. Physical release smoke

После настройки preview/release environment проверить минимум:

- iPhone Safari;
- iPhone Яндекс Браузер;
- Android Chrome;
- Android Яндекс Браузер;
- desktop Chrome/Edge.

Критические сценарии:

- student registration + email verification + login;
- tutor registration => `pending`;
- pending/rejected/suspended tutor отсутствует в публичном каталоге;
- owner/admin/moderator moderation approve/reject/suspend/reinstate;
- запрет самостоятельной смены роли;
- booking create/accept/decline/cancel/complete и конфликт времени;
- messages/media permissions;
- avatar upload;
- knowledge PDF upload/quarantine/scan/moderation/download;
- lesson authorization;
- video/TURN/reconnect;
- whiteboard sync/reconnect/access isolation;
- denied/error/offline states и отсутствие mobile overflow.

## 10. Controlled release order

1. Дождаться полностью зелёного PR release-candidate.
2. Настроить branch protection/ruleset и production environment protections.
3. Выполнить physical smoke на release-candidate/preview.
4. Отдельно подтвердить merge PR в `main`.
5. После merge запустить `MedStart production readiness audit` с `READ_ONLY_PRODUCTION_AUDIT`.
6. Если report содержит blockers — не выполнять production deploy и исправлять данные только отдельной одобренной операцией.
7. Если report `ready: true`, выполнить отдельно подтверждённый guarded Firebase config deploy.
8. Выпустить приложение с App Check client rollout без enforcement.
9. Проверить App Check metrics и production monitoring.
10. Затем включить App Check enforcement и повторить auth/mobile smoke.

Ни один шаг с production-данными, merge, deployment, секретами или необратимой миграцией не должен выполняться автоматически без отдельного подтверждения владельца.
