import { useEffect, useRef } from 'react'
import type { useTextInspector } from '../hooks/useTextInspector'
import type { InspectorUnit } from '../types/unicode'
import { LIVE_ANALYSIS_LIMIT, MAX_INSPECTOR_INPUT } from '../utils/textInspector'
import { TextInspectorExportMenu } from './TextInspectorExportMenu'
import { TextInspectorFindings } from './TextInspectorFindings'
import { TextInspectorList } from './TextInspectorList'
import { TextInspectorPreview } from './TextInspectorPreview'

const examples = [
  { label: 'No-break spaces', text: 'Price:\u00A0€10\nTotal:\u00A0€20' },
  { label: 'Hidden break', text: 'user\u200Bname@example.com' },
  { label: 'Bidi override', text: 'File: report\u202Etxt.exe\u202C' },
  { label: 'Emoji joiner', text: 'Hello 👩‍💻 ❤️' },
]

type InspectorModel = ReturnType<typeof useTextInspector>
type TextInspectorPanelProps = {
  model: InspectorModel
  onInspectUnit: (unit: InspectorUnit) => void
}

export function TextInspectorPanel({ model, onInspectUnit }: TextInspectorPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const { input } = model
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <section className="panel text-inspector-panel">
      <div className="sr-only" aria-live="polite" aria-atomic="true">{model.announceMessage}</div>
      <div className="panel-heading text-inspector-heading">
        <div>
          <h2>Text Inspector</h2>
          <p>Paste text, see what is unusual, and understand where and why it matters.</p>
        </div>
        <button
          type="button" className="ghost-button" disabled={!input.length}
          onClick={() => { model.onReset(); inputRef.current?.focus() }}
        >Clear text</button>
      </div>
      <label className="text-inspector-input">
        <span>Text to inspect</span>
        <textarea
          ref={inputRef} value={input} rows={5} spellCheck={false} dir="auto"
          aria-describedby="inspector-input-note"
          placeholder="Paste text containing spaces, joins, controls, or combining marks…"
          onChange={(event) => model.onInputChange(event.target.value)}
        />
      </label>
      <p id="inspector-input-note" className="inspector-input-note">
        Analyzed locally, without changing your text. Browser text input converts CR/CRLF to LF.
      </p>
      <InspectorExamples model={model} />
      <InspectorActions model={model} />
      <AnalysisStatus model={model} />
      {model.copiedLabel ? <p role="status">{model.copiedLabel} copied</p> : null}
      {model.error ? <p className="inspector-lossy" role="alert">{model.error}</p> : null}
      <InspectorContent model={model} onInspectUnit={onInspectUnit} />
      {!input.length ? (
        <div className="empty-state text-inspector-empty">
          <h3>No text inspected yet</h3>
          <p>Paste text or try an example to reveal hidden characters in context.</p>
        </div>
      ) : null}
    </section>
  )
}

function InspectorExamples({ model }: { model: InspectorModel }) {
  if (model.input.length) return null
  return (
    <div className="inspector-examples" aria-label="Try an example">
      <span>Try an example:</span>
      {examples.map((example) => (
        <button
          key={example.label} type="button" className="ghost-button"
          onClick={() => model.onInputChange(example.text)}
        >{example.label}</button>
      ))}
    </div>
  )
}

function InspectorActions({ model }: { model: InspectorModel }) {
  return (
    <div className="inspector-actions">
      {model.isLargeInput && !model.isUnsupported ? (
        <button
          type="button" className="ghost-button"
          disabled={!model.isReady || model.isAnalyzing || model.isCurrent}
          onClick={model.onAnalyze}
        >{model.isAnalyzing ? 'Analyzing…' : 'Analyze'}</button>
      ) : null}
      <TextInspectorExportMenu
        input={model.input} units={model.units} isCurrent={model.isCurrent} onCopy={model.onCopy}
      />
    </div>
  )
}

function InspectorContent({ model, onInspectUnit }: TextInspectorPanelProps) {
  if (!model.input.length || !model.isCurrent) return null
  const { summary } = model
  return (
    <>
      <div className="text-inspector-summary" aria-label="Text inspector summary">
        <span>{summary.codePointCount.toLocaleString()} code points</span>
        <span>{summary.lineCount.toLocaleString()} lines</span>
        <span>{summary.invisibleCount.toLocaleString()} invisible or control</span>
        <span>{summary.findingGroupCount} finding groups</span>
        <span>{summary.checkOrProblemGroupCount} worth checking / potential problems</span>
      </div>
      <TextInspectorPreview
        key={model.input} units={model.units} selection={model.selection}
        revealContext={model.selection?.revealContext ?? false}
        onSelectUnit={model.onSelectUnit}
      />
      <TextInspectorFindings
        findings={model.findings} units={model.units} selection={model.selection}
        onSelectFinding={model.onSelectFinding} onInspectUnit={onInspectUnit}
      />
      <TextInspectorList model={model} onInspectUnit={onInspectUnit} />
    </>
  )
}

function AnalysisStatus({ model }: { model: InspectorModel }) {
  let message = 'Analysis is current.'
  if (!model.isReady) message = 'Loading character metadata. Your input is retained.'
  else if (model.isUnsupported) {
    message = `Input exceeds the ${MAX_INSPECTOR_INPUT.toLocaleString()} UTF-16 unit limit. `
      + 'Inspect a smaller section. No text has been truncated; raw copy is still available.'
  } else if (model.isAnalyzing) message = 'Analyzing in the background. You can keep editing.'
  else if (!model.isCurrent) {
    message = `Analysis is not current. Above ${LIVE_ANALYSIS_LIMIT.toLocaleString()} UTF-16 units, `
      + 'choose Analyze to inspect the current text.'
  }
  return <p className="inspector-status" role="status">{message}</p>
}
