import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { InspectorUnit } from '../types/unicode'
import {
  formatInspectorCopy, getHtmlLossyCount, inspectorCopyFormats, type InspectorCopyFormat,
} from '../utils/textInspectorCopy'

type TextInspectorExportMenuProps = {
  input: string
  units: InspectorUnit[]
  isCurrent: boolean
  onCopy: (format: InspectorCopyFormat) => Promise<void>
}

export function TextInspectorExportMenu({
  input, units, isCurrent, onCopy,
}: TextInspectorExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [format, setFormat] = useState<InspectorCopyFormat | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    setIsOpen(false)
    setFormat(null)
  }, [input])

  useEffect(() => {
    if (!isOpen) return
    wrapperRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [isOpen])

  const closePreview = () => {
    setFormat(null)
    triggerRef.current?.focus()
  }

  return (
    <div className="inspector-export" ref={wrapperRef}>
      <div className="overflow-menu">
        <button
          type="button" ref={triggerRef} className="ghost-button overflow-menu__trigger"
          aria-label="Copy and export text" aria-haspopup="menu" aria-expanded={isOpen}
          aria-controls={menuId} disabled={!input.length}
          onClick={() => setIsOpen((open) => !open)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setIsOpen(true) }
          }}
        >Copy / Export…</button>
        {isOpen ? (
          <div
            id={menuId} role="menu" className="overflow-menu__content"
            aria-label="Text export formats"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); return
              }
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ))
              const current = items.indexOf(document.activeElement as HTMLButtonElement)
              const targets: Record<string, number> = {
                ArrowDown: (current + 1) % items.length,
                ArrowUp: (current - 1 + items.length) % items.length,
                Home: 0, End: items.length - 1,
              }
              if (event.key in targets) {
                event.preventDefault(); items[targets[event.key]!]?.focus()
              }
            }}
          >
            {inspectorCopyFormats.map((entry) => (
              <button
                key={entry.id} type="button" role="menuitem" className="overflow-menu__item"
                disabled={entry.id !== 'raw' && !isCurrent}
                onClick={() => { setFormat(entry.id); setIsOpen(false) }}
              >{entry.label}</button>
            ))}
          </div>
        ) : null}
      </div>
      {format ? (
        <ExportPreview
          key={format} input={input} units={units} format={format} isCurrent={isCurrent}
          onCopy={onCopy} onClose={closePreview}
        />
      ) : null}
    </div>
  )
}

function ExportPreview({
  input, units, format, isCurrent, onCopy, onClose,
}: TextInspectorExportMenuProps & { format: InspectorCopyFormat; onClose: () => void }) {
  const previewRef = useRef<HTMLTextAreaElement | null>(null)
  const output = useMemo(() => formatInspectorCopy(format, input, units), [format, input, units])
  const definition = inspectorCopyFormats.find((entry) => entry.id === format)!
  const lossyCount = format === 'html' ? getHtmlLossyCount(units) : 0
  const canCopy = input.length > 0 && (format === 'raw' || isCurrent)
  useEffect(() => { previewRef.current?.focus() }, [])
  return (
    <section className="inspector-export-preview" aria-label="Export preview">
      <strong>{definition.label}</strong>
      <p>{definition.context} Copies the whole input, regardless of filters.</p>
      {lossyCount ? (
        <p className="inspector-lossy" role="alert">
          Lossy HTML output: {lossyCount} values will be replaced or remapped by an HTML parser.
          Use raw text or the JavaScript literal for exact UTF-16 preservation.
        </p>
      ) : null}
      <textarea
        ref={previewRef} readOnly rows={3} dir="ltr" aria-label="Export output"
        value={output.slice(0, 4_000)}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
      />
      {output.length > 4_000 ? (
        <p>Preview shows the first 4,000 characters; copy includes the full output.</p>
      ) : null}
      <div className="inspector-export-preview__actions">
        <button
          type="button" className="ghost-button" disabled={!canCopy}
          onClick={() => { void onCopy(format) }}
        >{lossyCount ? 'Copy lossy HTML output' : `Copy ${definition.label}`}</button>
        <button type="button" className="ghost-button" onClick={onClose}>
          Close preview
        </button>
      </div>
    </section>
  )
}
