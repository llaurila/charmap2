import type { InspectorFinding, InspectorOccurrence, InspectorUnit } from '../types/unicode'
import { getInspectorContext } from '../utils/textInspector'

type TextInspectorFindingsProps = {
  findings: InspectorFinding[]
  units: InspectorUnit[]
  selection: (InspectorOccurrence & { findingId?: string; occurrenceIndex?: number }) | null
  onSelectFinding: (finding: InspectorFinding, occurrenceIndex: number) => void
  onInspectUnit: (unit: InspectorUnit) => void
}

type FindingCardProps = TextInspectorFindingsProps & { finding: InspectorFinding }

function FindingCard({
  finding, units, selection, onSelectFinding, onInspectUnit,
}: FindingCardProps) {
  const index = selection?.findingId === finding.id ? selection.occurrenceIndex ?? 0 : 0
  const occurrence = finding.occurrences[index]!
  const unit = units[occurrence.startIndex]!
  const label = {
    information: 'Information', check: 'Worth checking', problem: 'Potential problem',
  }
  return (
    <article className={`inspector-finding severity-${finding.severity}`}>
      <div className="inspector-finding__title">
        <strong>{finding.title}</strong>
        <span className="inspector-severity">{label[finding.severity]}</span>
      </div>
      <p>{finding.description}</p>
      <button
        type="button" className="inspector-finding__context"
        aria-label={`Reveal ${finding.title}, occurrence ${index + 1}`}
        onClick={() => onSelectFinding(finding, index)}
      >
        <span>Line {unit.line}, column {unit.column}</span>
        <code dir="ltr">
          {getInspectorContext(units, occurrence.startIndex, occurrence.endIndex)}
        </code>
      </button>
      <div className="inspector-finding__navigation">
        <button
          type="button" className="ghost-button" disabled={index === 0}
          aria-label={`Previous ${finding.title} occurrence`}
          onClick={() => onSelectFinding(finding, index - 1)}
        >Previous</button>
        <span>{(index + 1).toLocaleString()} of {finding.occurrences.length.toLocaleString()}</span>
        <button
          type="button" className="ghost-button" disabled={index + 1 === finding.occurrences.length}
          aria-label={`Next ${finding.title} occurrence`}
          onClick={() => onSelectFinding(finding, index + 1)}
        >Next</button>
        <button
          type="button" className="ghost-button" onClick={() => onInspectUnit(unit)}
          aria-label={`Inspect character for ${finding.title}`}
        >Details</button>
      </div>
    </article>
  )
}

export function TextInspectorFindings(props: TextInspectorFindingsProps) {
  const important = props.findings.filter((finding) => finding.severity !== 'information')
  const information = props.findings.filter((finding) => finding.severity === 'information')
  return (
    <section className="inspector-findings" aria-label="Diagnostic findings">
      <div className="panel-heading compact">
        <h3>Findings</h3>
        <p>Observations from the implemented checks—not a safety or validity certificate.</p>
      </div>
      {important.length ? important.map((finding) => (
        <FindingCard key={finding.id} {...props} finding={finding} />
      )) : <p className="inspector-status">Nothing worth checking was found by these checks.</p>}
      {information.length ? (
        <details className="inspector-information">
          <summary>Informational observations ({information.length})</summary>
          {information.map((finding) => (
            <FindingCard key={finding.id} {...props} finding={finding} />
          ))}
        </details>
      ) : null}
    </section>
  )
}
