from __future__ import annotations

from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_section(
    text: str,
    start: str,
    end: str,
    replacement: str,
    label: str,
) -> str:
    start_index = text.find(start)
    if start_index < 0:
        raise RuntimeError(f"{label}: start marker missing")
    end_index = text.find(end, start_index + len(start))
    if end_index < 0:
        raise RuntimeError(f"{label}: end marker missing")
    return text[:start_index] + replacement.rstrip() + "\n" + text[end_index:]


def update_dashboard() -> None:
    path = Path("artifacts/medstart/app/dashboard/layout.tsx")
    text = path.read_text()
    text = replace_once(
        text,
        '<div className="min-h-screen bg-slate-50">',
        '<div className="min-h-dvh bg-slate-50">',
        "dashboard dynamic viewport",
    )
    text = replace_once(
        text,
        '<main className="min-h-[calc(100vh-64px)] p-5 lg:p-8">{children}</main>',
        '<main className="min-h-[calc(100dvh-64px)] p-4 sm:p-5 lg:p-8">{children}</main>',
        "dashboard mobile spacing",
    )
    path.write_text(text)


def update_demo_room() -> None:
    path = Path("artifacts/medstart/components/live/DemoLessonRoom.tsx")
    text = path.read_text()
    text = replace_once(
        text,
        '<header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-5">',
        '<header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur sm:px-5">',
        "lesson room top safe area",
    )
    text = replace_once(
        text,
        '              onClick={() => setMobileView(view)}\n              className={`flex items-center',
        '              onClick={() => setMobileView(view)}\n              aria-pressed={mobileView === view}\n              className={`flex items-center',
        "lesson room tab state",
    )
    text = replace_once(
        text,
        '<footer className="shrink-0 border-t border-white/10 bg-slate-950/95 px-3 py-2 text-center text-[11px] text-slate-500 backdrop-blur">',
        '<footer className="shrink-0 border-t border-white/10 bg-slate-950/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center text-[11px] text-slate-500 backdrop-blur">',
        "lesson room bottom safe area",
    )
    path.write_text(text)


def update_whiteboard() -> None:
    path = Path("artifacts/medstart/components/live/ServerlessWhiteboard.tsx")
    text = path.read_text()

    text = replace_once(
        text,
        "return { label: 'Офлайн — изменения в очереди', icon: WifiOff }",
        "return { label: 'Офлайн — изменения не синхронизированы', icon: WifiOff }",
        "whiteboard offline status",
    )
    text = replace_once(
        text,
        "return { label: 'Сохранение будет повторено', icon: WifiOff }",
        "return { label: 'Не удалось сохранить изменение', icon: WifiOff }",
        "whiteboard error status",
    )
    text = replace_once(
        text,
        """    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function updateDraft""",
        """    } catch {
      setElements((current) => current.filter((item) => item.id !== element.id))
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function updateDraft""",
        "whiteboard save rollback",
    )
    text = replace_once(
        text,
        """    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function undo()""",
        """    } catch {
      setElements((current) => mergeElement(current, element))
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function undo()""",
        "whiteboard delete rollback",
    )
    text = replace_once(
        text,
        """    setElements([])
    redoRef.current = []
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await clearWhiteboard(bookingId)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }""",
        """    const previousElements = elementsRef.current
    setElements([])
    redoRef.current = []
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await clearWhiteboard(bookingId)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setElements(previousElements)
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }""",
        "whiteboard clear rollback",
    )
    text = replace_once(
        text,
        '<div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">',
        '<div className="mt-3 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">',
        "whiteboard toolbar scrolling",
    )
    text = replace_once(
        text,
        '                aria-label={item.label}\n                onClick={() => setTool(item.kind)}\n                className={`flex h-9 w-9 shrink-0',
        '                aria-label={item.label}\n                aria-pressed={tool === item.kind}\n                onClick={() => setTool(item.kind)}\n                className={`flex h-10 w-10 snap-start shrink-0',
        "whiteboard tool accessibility",
    )
    text = replace_once(
        text,
        '              aria-label={`Цвет ${item}`}\n              onClick={() => setColor(item)}\n              className={`h-7 w-7 shrink-0',
        '              aria-label={`Цвет ${item}`}\n              aria-pressed={color === item}\n              onClick={() => setColor(item)}\n              className={`h-8 w-8 snap-start shrink-0',
        "whiteboard color accessibility",
    )
    text = replace_once(
        text,
        'className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500"',
        'className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-base text-slate-900 outline-none focus:border-violet-500 sm:text-sm"',
        "whiteboard mobile input font",
    )
    path.write_text(text)


def update_medical_workspace() -> None:
    path = Path("artifacts/medstart/components/live/MedicalWorkspace.tsx")
    text = path.read_text()

    text = replace_once(
        text,
        "  useRef,\n",
        "",
        "remove medical file ref hook",
    )
    text = replace_once(
        text,
        "  type ChangeEvent,\n",
        "",
        "remove medical upload change event",
    )
    text = replace_once(
        text,
        "  Upload,\n",
        "",
        "remove medical upload icon",
    )
    text = replace_once(
        text,
        "  uploadMedicalAsset,\n",
        "",
        "remove disabled medical uploader import",
    )
    text = replace_once(
        text,
        "  const fileInputRef = useRef<HTMLInputElement>(null)\n",
        "",
        "remove medical file input ref",
    )
    text = replace_once(
        text,
        "  const [uploading, setUploading] = useState(false)\n",
        "",
        "remove medical uploading state",
    )
    text = replace_once(
        text,
        "  const [modality, setModality] = useState<ImagingModality>('xray')\n",
        "",
        "remove unused medical modality selector",
    )
    text = replace_once(
        text,
        "      <div className=\"min-h-0 flex-1 overflow-y-auto p-4 sm:p-5\">{children}</div>",
        "      <div className=\"min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5\">{children}</div>",
        "medical section overscroll",
    )
    text = replace_once(
        text,
        'className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-400"',
        'className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-400 sm:text-sm"',
        "medical textarea mobile font",
    )
    text = replace_once(
        text,
        "      if (objectUrl) URL.revokeObjectURL(objectUrl)",
        "      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)",
        "medical URL cleanup",
    )

    text = replace_section(
        text,
        "  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {",
        "  async function removeAsset(asset: MedicalAsset) {",
        "",
        "remove unavailable medical uploader",
    )

    text = replace_once(
        text,
        '<div className="flex items-center gap-2 overflow-x-auto pb-1">',
        '<div className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">',
        "medical module scrolling",
    )
    text = replace_once(
        text,
        '                onClick={() => setActiveModule(item.id)}\n                className={`flex shrink-0',
        '                onClick={() => setActiveModule(item.id)}\n                aria-pressed={activeModule === item.id}\n                className={`flex snap-start shrink-0',
        "medical module tab state",
    )
    text = replace_once(
        text,
        'description="Рентген, КТ, МРТ и УЗИ с безопасной загрузкой, настройкой отображения и наложением на совместную доску."',
        'description="Просмотр учебных снимков, настройка отображения и наложение ранее проверенных материалов на совместную доску."',
        "honest imaging description",
    )

    upload_card_start = """                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Тип исследования
                  </label>"""
    upload_card_end = """                </div>

                <div className="space-y-2">"""
    replacement = """                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-amber-100">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Загрузка временно отключена</p>
                      <p className="mt-2 text-xs leading-5 text-amber-100/75">
                        Новые снимки станут доступны после подключения серверного обезличивания,
                        проверки метаданных и антивирусного сканирования. Ранее проверенные учебные
                        материалы можно продолжать просматривать.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">"""
    text = replace_section(
        text,
        upload_card_start,
        upload_card_end,
        replacement,
        "disabled medical upload card",
    )

    asset_row_start = """                    assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedAssetId(asset.id)}"""
    asset_row_end = """                      </button>
                    ))"""
    asset_row_replacement = """                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`w-full rounded-2xl border p-3 ${
                          selectedAssetId === asset.id
                            ? 'border-violet-400 bg-violet-500/15'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAssetId(asset.id)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {asset.fileName}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {modalityLabels[asset.modality]} ·{' '}
                                {(asset.fileSize / 1024 / 1024).toFixed(1)} МБ
                              </p>
                            </div>
                          </button>
                          {(participantRole === 'tutor' ||
                            asset.uploaderUid === userUid) && (
                            <button
                              type="button"
                              onClick={() => void removeAsset(asset)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={`Удалить файл ${asset.fileName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))"""
    text = replace_section(
        text,
        asset_row_start,
        asset_row_end,
        asset_row_replacement,
        "medical asset accessible row",
    )

    path.write_text(text)


def update_registration() -> None:
    student_path = Path("artifacts/medstart/app/register/student/page.tsx")
    student = student_path.read_text()
    student = replace_once(
        student,
        "'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100'",
        "'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'",
        "student form mobile font",
    )
    student = replace_once(
        student,
        "                  className={inputClass}\n                  value={form.firstName}",
        "                  autoComplete=\"given-name\"\n                  required\n                  className={inputClass}\n                  value={form.firstName}",
        "student first name attributes",
    )
    student = replace_once(
        student,
        "                  className={inputClass}\n                  value={form.lastName}",
        "                  autoComplete=\"family-name\"\n                  required\n                  className={inputClass}\n                  value={form.lastName}",
        "student last name attributes",
    )
    student = replace_once(
        student,
        '                type="email"\n                className={inputClass}',
        '                type="email"\n                autoComplete="email"\n                required\n                className={inputClass}',
        "student email attributes",
    )
    student = student.replace(
        '                type="password"\n                className={inputClass}',
        '                type="password"\n                autoComplete="new-password"\n                required\n                className={inputClass}',
        2,
    )
    student = replace_once(
        student,
        "            <button\n              disabled={form.loading}",
        "            <button\n              type=\"submit\"\n              disabled={form.loading}",
        "student submit type",
    )
    student_path.write_text(student)

    tutor_path = Path("artifacts/medstart/app/register/tutor/page.tsx")
    tutor = tutor_path.read_text()
    tutor = replace_once(
        tutor,
        "'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100'",
        "'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'",
        "tutor form mobile font",
    )
    tutor = replace_once(
        tutor,
        "                  className={inputClass}\n                  value={form.firstName}",
        "                  autoComplete=\"given-name\"\n                  required\n                  className={inputClass}\n                  value={form.firstName}",
        "tutor first name attributes",
    )
    tutor = replace_once(
        tutor,
        "                  className={inputClass}\n                  value={form.lastName}",
        "                  autoComplete=\"family-name\"\n                  required\n                  className={inputClass}\n                  value={form.lastName}",
        "tutor last name attributes",
    )
    tutor = replace_once(
        tutor,
        '                type="email"\n                autoComplete="email"\n                className={inputClass}',
        '                type="email"\n                autoComplete="email"\n                required\n                className={inputClass}',
        "tutor email required",
    )
    tutor = replace_once(
        tutor,
        "                <input\n                  className={inputClass}\n                  placeholder=\"Например: анатомия и физиология\"",
        "                <input\n                  required\n                  className={inputClass}\n                  placeholder=\"Например: анатомия и физиология\"",
        "tutor specialization required",
    )
    tutor = replace_once(
        tutor,
        '                  type="number"\n                  min="0"',
        '                  type="number"\n                  inputMode="numeric"\n                  min="0"',
        "tutor price input mode",
    )
    tutor = tutor.replace(
        '                  type="password"\n                  autoComplete="new-password"\n                  className={inputClass}',
        '                  type="password"\n                  autoComplete="new-password"\n                  required\n                  className={inputClass}',
        2,
    )
    tutor = replace_once(
        tutor,
        "                  onClick={() => form.setOnline(!form.online)}\n                  className={`rounded-2xl",
        "                  onClick={() => form.setOnline(!form.online)}\n                  aria-pressed={form.online}\n                  className={`rounded-2xl",
        "tutor online format state",
    )
    tutor = replace_once(
        tutor,
        "                  onClick={() => form.setInPerson(!form.inPerson)}\n                  className={`rounded-2xl",
        "                  onClick={() => form.setInPerson(!form.inPerson)}\n                  aria-pressed={form.inPerson}\n                  className={`rounded-2xl",
        "tutor in-person format state",
    )
    tutor = replace_once(
        tutor,
        "            <button\n              disabled={form.loading}",
        "            <button\n              type=\"submit\"\n              disabled={form.loading}",
        "tutor submit type",
    )
    tutor_path.write_text(tutor)


update_dashboard()
update_demo_room()
update_whiteboard()
update_medical_workspace()
update_registration()
