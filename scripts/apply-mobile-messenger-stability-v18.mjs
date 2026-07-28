import { readFileSync, writeFileSync } from 'node:fs'

function replace(path, before, after, label) {
  const source = readFileSync(path, 'utf8')
  const count = source.split(before).length - 1
  if (count !== 1) {
    throw new Error(`${label}: expected one match in ${path}, found ${count}`)
  }
  writeFileSync(path, source.replace(before, after))
}

const messenger = 'artifacts/medstart/components/messages/MedicalMessenger.tsx'
const capture = 'artifacts/medstart/components/messages/MediaCaptureDialog.tsx'
const bubble = 'artifacts/medstart/components/messages/MessageBubble.tsx'
const media = 'artifacts/medstart/lib/chat-media.ts'
const conversations = 'artifacts/medstart/lib/conversations.ts'
const action = 'artifacts/medstart/app/api/messages/action/route.ts'

replace(
  messenger,
  `  const participants = conversation.participantUids.map((uid) => ({\n    uid,\n    name: conversation.participantNames[uid] || 'Пользователь MedStart',\n    avatar: conversation.participantAvatars[uid] || '',\n  }))`,
  `  const participantUids = [...new Set([\n    ...conversation.participantUids,\n    ...Object.keys(conversation.participantNames || {}),\n    ...Object.keys(conversation.participantAvatars || {}),\n  ])]\n  const participants = participantUids.map((uid) => ({\n    uid,\n    name: conversation.participantNames[uid] || 'Пользователь MedStart',\n    avatar: conversation.participantAvatars[uid] || '',\n  }))`,
  'recover participant uid for legacy conversations',
)

replace(
  messenger,
  `function prettyDate(value: string) {\n  if (!value) return 'Дата не указана'\n  const date = new Date(\`${'${value}'}T12:00:00\`)\n  return Number.isNaN(date.getTime())\n    ? value\n    : new Intl.DateTimeFormat('ru-RU', {\n        day: 'numeric',\n        month: 'long',\n        year: 'numeric',\n      }).format(date)\n}\n`,
  `function prettyDate(value: string) {\n  if (!value) return 'Дата не указана'\n  const date = new Date(\`${'${value}'}T12:00:00\`)\n  return Number.isNaN(date.getTime())\n    ? value\n    : new Intl.DateTimeFormat('ru-RU', {\n        day: 'numeric',\n        month: 'long',\n        year: 'numeric',\n      }).format(date)\n}\n\nfunction friendlyMessengerError(error: unknown, fallback: string) {\n  const message = error instanceof Error ? error.message.trim() : ''\n  if (/load failed|failed to fetch|network|networkerror|abort|timeout/i.test(message)) {\n    return 'Связь с сервером MedStart прервалась. Проверьте интернет и повторите действие.'\n  }\n  return message || fallback\n}\n`,
  'add friendly safari network errors',
)

replace(
  messenger,
  `  const bottomRef = useRef<HTMLDivElement>(null)\n  const fileInputRef = useRef<HTMLInputElement>(null)`,
  `  const messageScrollRef = useRef<HTMLDivElement>(null)\n  const fileInputRef = useRef<HTMLInputElement>(null)`,
  'replace page scroll anchor',
)

replace(
  messenger,
  `  useEffect(() => {\n    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })\n  }, [messages])`,
  `  useEffect(() => {\n    const container = messageScrollRef.current\n    if (!container) return\n    container.scrollTo({\n      top: container.scrollHeight,\n      behavior: messages.length > 1 ? 'smooth' : 'auto',\n    })\n  }, [messages])`,
  'scroll only message pane',
)

replace(
  messenger,
  `          ? caught.message\n          : 'Не удалось отправить сообщение.',`,
  `          ? friendlyMessengerError(caught, 'Не удалось отправить сообщение.')\n          : 'Не удалось отправить сообщение.',`,
  'friendly text message failure',
)

replace(
  messenger,
  `        caught instanceof Error ? caught.message : 'Не удалось отправить вложение.',`,
  `        friendlyMessengerError(caught, 'Не удалось отправить вложение.'),`,
  'friendly attachment failure',
)

replace(
  messenger,
  `    <div className="flex h-[calc(100dvh-96px)] min-h-[650px] flex-col gap-3">`,
  `    <div className="flex h-[calc(100dvh-108px)] min-h-[560px] w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden sm:h-[calc(100dvh-96px)] sm:min-h-[650px]">`,
  'bound messenger viewport',
)

replace(
  messenger,
  `      <section className="relative grid min-h-0 flex-1 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(520px,1fr)_320px]">`,
  `      <section className="relative grid min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl sm:rounded-[30px] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_320px]">`,
  'bound messenger grid',
)

replace(
  messenger,
  `          className={\`${'${selected'} ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col bg-slate-50\`}`,
  `          className={\`${'${selected'} ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-slate-50\`}`,
  'bound central chat panel',
)

replace(
  messenger,
  `              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.08),_transparent_38%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)] p-3 sm:p-5 lg:p-6">`,
  `              <div ref={messageScrollRef} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.08),_transparent_38%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)] p-3 sm:p-5 lg:p-6">`,
  'scroll container reference',
)

replace(messenger, `                <div ref={bottomRef} />`, `                <div aria-hidden="true" />`, 'remove page scroll target')

replace(
  messenger,
  `      <div className="flex items-center gap-2 px-3 pt-3 sm:hidden">\n        <button\n          type="button"\n          onClick={onToggleEmoji}\n          disabled={sending}\n          className="ms-btn ms-btn-soft min-h-9 flex-1 px-3 py-2 text-xs"\n        >\n          <Smile className="h-4 w-4" /> Эмодзи\n        </button>\n        <button\n          type="button"\n          onClick={onVideo}\n          disabled={sending}\n          className="ms-btn ms-btn-soft min-h-9 flex-1 px-3 py-2 text-xs"\n        >\n          <Camera className="h-4 w-4" /> Видеокружок\n        </button>\n      </div>\n\n`,
  ``,
  'remove overflowing mobile text toolbar',
)

replace(
  messenger,
  `      <form onSubmit={onSubmit} className="p-3 sm:p-4">\n        <div className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">\n          <div className="flex shrink-0 items-center gap-1">\n            <input\n              ref={fileInputRef}\n              type="file"\n              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"\n              className="hidden"\n              onChange={(event) => onChooseAttachment(event.target.files?.[0])}\n            />\n            <button\n              type="button"\n              onClick={() => fileInputRef.current?.click()}\n              disabled={sending}\n              className="ms-icon-btn ms-icon-btn-neutral"\n              aria-label="Прикрепить файл"\n            >\n              <Paperclip className="h-5 w-5" />\n            </button>\n            <button\n              type="button"\n              onClick={onToggleMedical}\n              disabled={sending}\n              className="ms-icon-btn ms-icon-btn-neutral"\n              aria-label="Медицинские инструменты"\n            >\n              <Stethoscope className="h-5 w-5" />\n            </button>\n            <button\n              type="button"\n              onClick={onToggleEmoji}\n              disabled={sending}\n              className="ms-icon-btn ms-icon-btn-neutral hidden sm:flex"\n              aria-label="Медицинские эмодзи"\n            >\n              <Smile className="h-5 w-5" />\n            </button>\n          </div>\n          <textarea\n            value={draft}\n            onChange={(event) => onDraftChange(event.target.value)}\n            onKeyDown={(event) => {\n              if (\n                event.key === 'Enter' &&\n                !event.shiftKey &&\n                !event.nativeEvent.isComposing\n              ) {\n                event.preventDefault()\n                event.currentTarget.form?.requestSubmit()\n              }\n            }}\n            rows={1}\n            maxLength={2_000}\n            placeholder={\n              moderatorMode\n                ? 'Напишите служебное сообщение MedStart…'\n                : 'Напишите сообщение…'\n            }\n            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 outline-none"\n          />\n          <div className="flex shrink-0 items-center gap-1">\n            <button\n              type="button"\n              onClick={onVoice}\n              disabled={sending}\n              className="ms-icon-btn ms-icon-btn-neutral"\n              aria-label="Записать голосовое"\n            >\n              <Mic className="h-5 w-5" />\n            </button>\n            <button\n              type="button"\n              onClick={onVideo}\n              disabled={sending}\n              className="ms-icon-btn ms-icon-btn-neutral hidden sm:flex"\n              aria-label="Записать видеокружок"\n            >\n              <Camera className="h-5 w-5" />\n            </button>\n            <button\n              disabled={sending || !draft.trim()}\n              className="ms-icon-btn ms-icon-btn-primary"\n              aria-label="Отправить"\n            >\n              {sending ? (\n                <LoaderCircle className="h-5 w-5 animate-spin" />\n              ) : (\n                <Send className="h-5 w-5" />\n              )}\n            </button>\n          </div>\n        </div>\n        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-400">\n          <span>Enter — отправить · Shift+Enter — новая строка</span>\n          <span>{draft.length}/2000</span>\n        </div>\n      </form>`,
  `      <form onSubmit={onSubmit} className="min-w-0 p-3 sm:p-4">\n        <div className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100 sm:rounded-[24px]">\n          <textarea\n            value={draft}\n            onChange={(event) => onDraftChange(event.target.value)}\n            onKeyDown={(event) => {\n              if (\n                event.key === 'Enter' &&\n                !event.shiftKey &&\n                !event.nativeEvent.isComposing\n              ) {\n                event.preventDefault()\n                event.currentTarget.form?.requestSubmit()\n              }\n            }}\n            rows={1}\n            maxLength={2_000}\n            placeholder={\n              moderatorMode\n                ? 'Напишите служебное сообщение MedStart…'\n                : 'Напишите сообщение…'\n            }\n            className="max-h-32 min-h-12 w-full min-w-0 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 outline-none [overflow-wrap:anywhere]"\n          />\n          <div className="mt-1 flex min-w-0 items-center justify-between gap-2 border-t border-slate-200/80 pt-2">\n            <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5">\n              <input\n                ref={fileInputRef}\n                type="file"\n                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"\n                className="hidden"\n                onChange={(event) => onChooseAttachment(event.target.files?.[0])}\n              />\n              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Прикрепить файл">\n                <Paperclip className="h-5 w-5" />\n              </button>\n              <button type="button" onClick={onToggleMedical} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Медицинские инструменты">\n                <Stethoscope className="h-5 w-5" />\n              </button>\n              <button type="button" onClick={onToggleEmoji} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Медицинские эмодзи">\n                <Smile className="h-5 w-5" />\n              </button>\n              <button type="button" onClick={onVoice} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Записать голосовое">\n                <Mic className="h-5 w-5" />\n              </button>\n              <button type="button" onClick={onVideo} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Записать видеокружок">\n                <Camera className="h-5 w-5" />\n              </button>\n            </div>\n            <button disabled={sending || !draft.trim()} className="ms-icon-btn ms-icon-btn-primary shrink-0" aria-label="Отправить">\n              {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}\n            </button>\n          </div>\n        </div>\n        <div className="mt-2 flex items-center justify-end gap-3 px-1 text-[11px] text-slate-400 sm:justify-between">\n          <span className="hidden sm:inline">Enter — отправить · Shift+Enter — новая строка</span>\n          <span>{draft.length}/2000</span>\n        </div>\n      </form>`,
  'replace mobile composer layout',
)

replace(
  capture,
  `              video: {\n                facingMode: 'user',\n                width: { ideal: 720 },\n                height: { ideal: 720 },\n                aspectRatio: { ideal: 1 },\n              },`,
  `              video: {\n                facingMode: 'user',\n                width: { ideal: 360, max: 480 },\n                height: { ideal: 360, max: 480 },\n                frameRate: { ideal: 12, max: 18 },\n                aspectRatio: { ideal: 1 },\n              },`,
  'reduce mobile video capture weight',
)

replace(
  capture,
  `      const recorder = mimeType\n        ? new MediaRecorder(stream, { mimeType })\n        : new MediaRecorder(stream)`,
  `      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {}\n      if (kind === 'video_note') {\n        recorderOptions.videoBitsPerSecond = 450_000\n        recorderOptions.audioBitsPerSecond = 32_000\n      } else {\n        recorderOptions.audioBitsPerSecond = 32_000\n      }\n      let recorder: MediaRecorder\n      try {\n        recorder = new MediaRecorder(stream, recorderOptions)\n      } catch {\n        recorder = mimeType\n          ? new MediaRecorder(stream, { mimeType })\n          : new MediaRecorder(stream)\n      }`,
  'set recorder bitrate with safari fallback',
)

replace(capture, `      recorder.start(500)`, `      recorder.start(1_000)`, 'reduce video chunks')
replace(capture, `      <section className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl">`, `      <section className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl sm:max-w-lg sm:rounded-[32px]">`, 'fit capture dialog on iphone')
replace(capture, `        <div className="p-5 sm:p-7">`, `        <div className="p-4 sm:p-7">`, 'compact capture dialog')
replace(capture, `          <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white">`, `          <div className="flex min-h-56 flex-col items-center justify-center rounded-[24px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-4 text-white sm:min-h-64 sm:rounded-[28px] sm:p-6">`, 'compact capture preview')

replace(
  capture,
  `                <video\n                  ref={videoRef}\n                  src={phase === 'preview' || phase === 'sending' ? recordedUrl : undefined}\n                  muted={phase === 'recording'}\n                  controls={phase === 'preview' || phase === 'sending'}\n                  playsInline\n                  autoPlay={phase === 'recording'}\n                  className="h-48 w-48 rounded-full border-4 border-white/20 bg-slate-900 object-cover shadow-2xl sm:h-56 sm:w-56"\n                />`,
  `                <video\n                  ref={videoRef}\n                  src={phase === 'preview' || phase === 'sending' ? recordedUrl : undefined}\n                  muted={phase === 'recording'}\n                  controls={phase === 'preview' || phase === 'sending'}\n                  playsInline\n                  autoPlay={phase === 'recording'}\n                  preload="metadata"\n                  onError={() => {\n                    if (phase === 'preview') {\n                      setError('Safari не смог воспроизвести предварительный файл. Перезапишите видеокружок.')\n                    }\n                  }}\n                  className="h-44 w-44 rounded-full border-4 border-white/20 bg-slate-900 object-cover shadow-2xl sm:h-56 sm:w-56"\n                />\n                {phase === 'ready' && (\n                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-900/95 text-cyan-100">\n                    <Camera className="h-10 w-10" />\n                    <span className="mt-2 text-xs font-bold">Камера ещё не включена</span>\n                  </div>\n                )}`,
  'add stable video placeholder and preview error',
)

replace(
  media,
  `async function authorizationToken() {\n  const user = auth.currentUser\n  if (!user) throw new Error('Сессия авторизации устарела. Войдите повторно.')\n  return user.getIdToken()\n}\n`,
  `async function authorizationToken(forceRefresh = false) {\n  const user = auth.currentUser\n  if (!user) throw new Error('Сессия авторизации устарела. Войдите повторно.')\n  return user.getIdToken(forceRefresh)\n}\n\nfunction mediaNetworkError(fallback: string) {\n  return new Error(\`${'${fallback}'} Проверьте интернет и повторите действие.\`)\n}\n\nasync function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 30_000) {\n  const controller = new AbortController()\n  const timer = window.setTimeout(() => controller.abort(), timeoutMs)\n  try {\n    return await fetch(input, { ...init, signal: controller.signal })\n  } catch {\n    throw mediaNetworkError('Связь с сервером MedStart прервалась.')\n  } finally {\n    window.clearTimeout(timer)\n  }\n}\n`,
  'add media network handling',
)

replace(
  media,
  `    request.responseType = 'json'\n    request.upload.onprogress = (event) => {\n      if (!event.lengthComputable) return\n      input.onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)))\n    }\n    request.onerror = () => reject(new Error('Сеть прервала защищённую загрузку.'))\n    request.onload = () => {\n      const payload = (request.response || {}) as MediaApiResponse\n      if (request.status < 200 || request.status >= 300 || !payload.path) {\n        reject(new Error(payload.error || 'Сервер не принял медиафайл.'))\n        return\n      }\n      input.onProgress?.(100)\n      resolve(payload.path)\n    }`,
  `    request.responseType = 'text'\n    request.timeout = 90_000\n    request.upload.onprogress = (event) => {\n      if (!event.lengthComputable) return\n      input.onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)))\n    }\n    request.onerror = () => reject(mediaNetworkError('Сеть прервала защищённую загрузку.'))\n    request.ontimeout = () => reject(mediaNetworkError('Сервер не успел принять запись.'))\n    request.onabort = () => reject(new Error('Загрузка записи отменена.'))\n    request.onload = () => {\n      let payload: MediaApiResponse = {}\n      try {\n        payload = JSON.parse(request.responseText || '{}') as MediaApiResponse\n      } catch {\n        payload = {}\n      }\n      if (request.status < 200 || request.status >= 300 || !payload.path) {\n        const fallback = request.status === 413\n          ? 'Запись слишком большая. Сделайте видеокружок короче и повторите.'\n          : 'Сервер не принял медиафайл.'\n        reject(new Error(payload.error || fallback))\n        return\n      }\n      input.onProgress?.(100)\n      resolve(payload.path)\n    }`,
  'harden xhr upload on safari',
)

replace(media, `  const response = await fetch('/api/messages/media', {`, `  const response = await fetchWithTimeout('/api/messages/media', {`, 'timeout delete media')
replace(media, `  })\n  if (!response.ok) {\n    const payload = (await response.json().catch(() => ({}))) as MediaApiResponse\n    throw new Error(payload.error || 'Не удалось удалить незавершённую загрузку.')`, `  }, 20_000)\n  if (!response.ok) {\n    const payload = (await response.json().catch(() => ({}))) as MediaApiResponse\n    throw new Error(payload.error || 'Не удалось удалить незавершённую загрузку.')`, 'close delete timeout call')
replace(media, `  const response = await fetch(\`/api/messages/media?path=${'${encodeURIComponent(path)}'}\`, {`, `  const response = await fetchWithTimeout(\`/api/messages/media?path=${'${encodeURIComponent(path)}'}\`, {`, 'timeout load media')
replace(media, `    cache: 'no-store',\n  })\n  if (!response.ok) {`, `    cache: 'no-store',\n  }, 45_000)\n  if (!response.ok) {`, 'close load timeout call')

replace(
  conversations,
  `interface MessageApiResponse {\n  ok?: boolean\n  error?: string\n}\n`,
  `interface MessageApiResponse {\n  ok?: boolean\n  error?: string\n}\n\nclass MessageNetworkError extends Error {}\n\nfunction friendlyMessageNetworkError() {\n  return new Error('Связь с сервером MedStart прервалась. Проверьте интернет и повторите действие.')\n}\n\nfunction newRequestId() {\n  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {\n    return crypto.randomUUID()\n  }\n  return \`msg-${'${Date.now()}'}-${'${Math.random().toString(36).slice(2)}'}\`\n}\n`,
  'add idempotent request helpers',
)

replace(
  conversations,
  `async function postMessageAction(body: Record<string, unknown>) {\n  const currentUser = auth.currentUser\n  if (!currentUser) {\n    throw new Error('Сессия авторизации устарела. Войдите повторно.')\n  }\n  const token = await currentUser.getIdToken()\n  const response = await fetch('/api/messages/action', {\n    method: 'POST',\n    headers: {\n      Authorization: \`Bearer ${'${token}'}\`,\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify(body),\n  })\n  const payload = (await response.json().catch(() => ({}))) as MessageApiResponse\n  if (!response.ok) {\n    throw new Error(payload.error || 'Сервер не принял операцию с сообщением.')\n  }\n}`,
  `async function performMessageAction(body: Record<string, unknown>, forceRefresh = false) {\n  const currentUser = auth.currentUser\n  if (!currentUser) {\n    throw new Error('Сессия авторизации устарела. Войдите повторно.')\n  }\n  const token = await currentUser.getIdToken(forceRefresh)\n  const controller = new AbortController()\n  const timer = window.setTimeout(() => controller.abort(), 25_000)\n  let response: Response\n  try {\n    response = await fetch('/api/messages/action', {\n      method: 'POST',\n      headers: {\n        Authorization: \`Bearer ${'${token}'}\`,\n        'Content-Type': 'application/json',\n      },\n      body: JSON.stringify(body),\n      cache: 'no-store',\n      signal: controller.signal,\n    })\n  } catch {\n    throw new MessageNetworkError('NETWORK')\n  } finally {\n    window.clearTimeout(timer)\n  }\n  const payload = (await response.json().catch(() => ({}))) as MessageApiResponse\n  if (!response.ok) {\n    throw new Error(payload.error || 'Сервер не принял операцию с сообщением.')\n  }\n}\n\nasync function postMessageAction(body: Record<string, unknown>, retryNetwork = false) {\n  try {\n    await performMessageAction(body)\n  } catch (error) {\n    if (retryNetwork && error instanceof MessageNetworkError) {\n      try {\n        await performMessageAction(body, true)\n        return\n      } catch (retryError) {\n        if (!(retryError instanceof MessageNetworkError)) throw retryError\n      }\n    } else if (!(error instanceof MessageNetworkError)) {\n      throw error\n    }\n    throw friendlyMessageNetworkError()\n  }\n}`,
  'retry message action safely',
)

replace(
  conversations,
  `  await postMessageAction({\n    action: 'send',\n    conversationId,\n    message,\n  })`,
  `  await postMessageAction({\n    action: 'send',\n    requestId: newRequestId(),\n    conversationId,\n    message,\n  }, true)`,
  'idempotent send retry',
)

replace(action, `  conversationId?: unknown\n  messageId?: unknown`, `  conversationId?: unknown\n  requestId?: unknown\n  messageId?: unknown`, 'accept request id')
replace(action, `function integer(value: unknown) {`, `function baseMime(value: string) {\n  return value.split(';', 1)[0].trim().toLowerCase()\n}\n\nfunction integer(value: unknown) {`, 'add base mime helper')
replace(action, `  const actualType = String(metadata.contentType || '')`, `  const actualType = String(metadata.contentType || '')\n  const actualBaseType = baseMime(actualType)\n  const claimedBaseType = baseMime(input.claimedType)`, 'normalize stored mime')
replace(action, `  if (actualType !== input.claimedType) {`, `  if (!actualBaseType || actualBaseType !== claimedBaseType) {`, 'compare base mime')
replace(action, `  if (input.kind === 'voice' && !actualType.startsWith('audio/')) {`, `  if (input.kind === 'voice' && !actualBaseType.startsWith('audio/')) {`, 'validate base audio mime')
replace(action, `  if (input.kind === 'video_note' && !actualType.startsWith('video/')) {`, `  if (input.kind === 'video_note' && !actualBaseType.startsWith('video/')) {`, 'validate base video mime')
replace(action, `  if (input.kind === 'file' && !safeFiles.has(actualType)) {`, `  if (input.kind === 'file' && !safeFiles.has(actualBaseType)) {`, 'validate base file mime')
replace(action, `  const conversationId = text(body.conversationId, 400)\n  await requireConversationAccess(conversationId, actor)`, `  const conversationId = text(body.conversationId, 400)\n  const requestId = text(body.requestId, 80)\n  if (requestId && !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) {\n    throw new Error('Некорректный идентификатор отправки.')\n  }\n  await requireConversationAccess(conversationId, actor)`, 'validate request id')
replace(action, `  const messageRef = conversationRef.collection('messages').doc()`, `  const messageRef = requestId\n    ? conversationRef.collection('messages').doc(requestId)\n    : conversationRef.collection('messages').doc()\n  if (requestId) {\n    const existing = await messageRef.get()\n    if (existing.exists) return { messageId: messageRef.id }\n  }`, 'deduplicate retried messages')

replace(bubble, `    <article className={\`group flex ${'${own'} ? 'justify-end' : 'justify-start'}\`}>`, `    <article className={\`group flex min-w-0 max-w-full ${'${own'} ? 'justify-end' : 'justify-start'}\`}>`, 'bound message article')
replace(bubble, `        className={\`flex max-w-[92%] flex-col sm:max-w-[78%] xl:max-w-[70%] ${`, `        className={\`flex min-w-0 max-w-[92%] flex-col sm:max-w-[78%] xl:max-w-[70%] ${`, 'bound message group')
replace(bubble, `          className={\`relative rounded-[22px] px-4 py-3 shadow-sm ${`, `          className={\`relative max-w-full overflow-hidden rounded-[22px] px-4 py-3 shadow-sm [overflow-wrap:anywhere] ${`, 'bound message bubble')
replace(bubble, `      <div className="mt-2 min-w-[240px] rounded-2xl bg-white/10 p-3">`, `      <div className="mt-2 w-[min(260px,calc(100vw-96px))] min-w-0 max-w-full rounded-2xl bg-white/10 p-3">`, 'fit iphone audio controls')
replace(bubble, `          className="h-10 w-full max-w-sm"`, `          className="block h-10 w-full min-w-0 max-w-full"`, 'bound audio control')
replace(bubble, `            className="h-48 w-48 rounded-full border-4 border-white/20 bg-slate-950 object-cover shadow-xl sm:h-56 sm:w-56"`, `            className="h-40 w-40 max-w-full rounded-full border-4 border-white/20 bg-slate-950 object-cover shadow-xl sm:h-52 sm:w-52"`, 'fit video note on iphone')
replace(bubble, `                  className={\`absolute bottom-10 z-20 flex gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${`, `                  className={\`absolute bottom-10 z-20 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${`, 'bound reaction picker')

console.log('Applied mobile messenger stability v18')
