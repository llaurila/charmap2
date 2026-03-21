import { useDetailCopyFormats } from '../hooks/useDetailCopyFormats'
import type { CopyFormat } from '../utils/copyFormats'
import { formatCodePoint } from '../utils/copyFormats'
import { getGlyphCaption, getPrimaryGlyph } from '../utils/rendering'
import type { CharacterRecord, ResultRecord } from '../types/unicode'

const isLoadedCharacterRecord = (record: ResultRecord): record is CharacterRecord =>
  'category' in record

const summarizeCaseMap = (record: CharacterRecord): string => {
  if (!record.caseMap) {
    return 'None'
  }

  return Object.entries(record.caseMap)
    .map(([key, value]) => `${key}: ${formatCodePoint(value)}`)
    .join(' | ')
}

const summarizeFlags = (record: CharacterRecord): string => record.flags?.join(', ') ?? 'None'

const getDetailDescription = (record: ResultRecord): string => {
  if (!isLoadedCharacterRecord(record)) {
    return 'Loading block detail data for richer metadata.'
  }

  return (
    record.description ??
    'Generated metadata is loaded, but this character does not need a custom description.'
  )
}

type DetailPanelProps = {
  isPinned: boolean
  onTogglePinned: () => void
  selectedDetailRecord: ResultRecord | null
}

function DetailBadges({ record }: { record: ResultRecord }) {
  if (isLoadedCharacterRecord(record)) {
    return (
      <div className="inline-badges detail-badges">
        <span>{formatCodePoint(record.cp)}</span>
        <span>{record.block}</span>
        <span>{record.script}</span>
        <span>{record.category}</span>
        <span>{record.kind}</span>
      </div>
    )
  }

  return (
    <div className="inline-badges detail-badges">
      <span>{formatCodePoint(record.cp)}</span>
      <span>{record.block}</span>
      <span>{record.script}</span>
      <span>{record.kind}</span>
    </div>
  )
}

function DetailMetadata({ record }: { record: ResultRecord }) {
  const age = isLoadedCharacterRecord(record) ? record.age ?? 'Unknown' : 'Loading'
  const flags = isLoadedCharacterRecord(record) ? summarizeFlags(record) : 'Loading'
  const caseMap = isLoadedCharacterRecord(record) ? summarizeCaseMap(record) : 'Loading'

  return (
    <dl className="detail-list">
      <div>
        <dt>Aliases</dt>
        <dd>{record.aliases?.join(', ') ?? 'None'}</dd>
      </div>
      <div>
        <dt>Unicode age</dt>
        <dd>{age}</dd>
      </div>
      <div>
        <dt>Flags</dt>
        <dd>{flags}</dd>
      </div>
      <div>
        <dt>Case map</dt>
        <dd>{caseMap}</dd>
      </div>
    </dl>
  )
}

function DetailPanelContent({
  copiedLabel,
  copyFormats,
  isPinned,
  onCopyFormat,
  onTogglePinned,
  selectedDetailRecord,
}: {
  copiedLabel: string | null
  copyFormats: CopyFormat[]
  isPinned: boolean
  onCopyFormat: (entry: CopyFormat) => Promise<void>
  onTogglePinned: () => void
  selectedDetailRecord: ResultRecord
}) {
  return (
    <>
      <div className="detail-preview">
        <div className={`detail-glyph kind-${selectedDetailRecord.kind}`}>
          {getPrimaryGlyph(selectedDetailRecord)}
        </div>
        <div className="detail-copy">
          <p className="detail-caption">{getGlyphCaption(selectedDetailRecord)}</p>
          <div className="detail-title-row">
            <h2>{selectedDetailRecord.name}</h2>
            <button
              type="button"
              className={isPinned ? 'ghost-button pin-button is-active' : 'ghost-button pin-button'}
              aria-pressed={isPinned}
              aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${selectedDetailRecord.name}`}
              onClick={onTogglePinned}
            >
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
          <p className="detail-description">{getDetailDescription(selectedDetailRecord)}</p>
        </div>
      </div>

      <DetailBadges record={selectedDetailRecord} />

      <DetailMetadata record={selectedDetailRecord} />

      <div className="copy-section">
        <div className="panel-heading compact">
          <h3>Copy Formats</h3>
          <p>
            {copiedLabel
              ? `${copiedLabel} copied`
              : 'One-click output variants for common workflows.'}
          </p>
        </div>

        <div className="copy-grid">
          {copyFormats.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="copy-card"
              aria-label={`Copy ${entry.label} for ${selectedDetailRecord.name}`}
              onClick={async () => {
                await onCopyFormat(entry)
              }}
            >
              <span>{entry.label}</span>
              <code>{entry.value}</code>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export function DetailPanel({
  isPinned,
  onTogglePinned,
  selectedDetailRecord,
}: DetailPanelProps) {
  const { announceMessage, copiedLabel, copyFormats, handleCopyFormat } =
    useDetailCopyFormats(selectedDetailRecord)

  return (
    <aside className="panel detail-panel">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceMessage}
      </div>
      {selectedDetailRecord ? (
        <DetailPanelContent
          copiedLabel={copiedLabel}
          copyFormats={copyFormats}
          isPinned={isPinned}
          onCopyFormat={handleCopyFormat}
          onTogglePinned={onTogglePinned}
          selectedDetailRecord={selectedDetailRecord}
        />
      ) : (
        <div className="empty-state detail-empty">
          <h3>No character selected</h3>
          <p>Choose a result to inspect metadata and copy formats.</p>
        </div>
      )}
    </aside>
  )
}
