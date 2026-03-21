import type { ResultRecord } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'

type PinnedItemsPanelProps = {
  items: ResultRecord[]
  onSelectPinned: (cp: number) => void
  selectedCp: number | null
}

export function PinnedItemsPanel({
  items,
  onSelectPinned,
  selectedCp,
}: PinnedItemsPanelProps) {
  return (
    <aside className="panel side-panel">
      <div className="panel-heading">
        <h2>Pinned</h2>
        <p>Saved shortcuts stay in this browser so you can jump back fast.</p>
      </div>

      {items.length > 0 ? (
        <div className="pinned-list">
          {items.map((record) => (
            <button
              key={record.cp}
              type="button"
              className={
                selectedCp === record.cp ? 'chip pinned-chip is-active' : 'chip pinned-chip'
              }
              onClick={() => onSelectPinned(record.cp)}
              aria-label={`Show details for ${record.name}`}
            >
              <span className={`pinned-chip__glyph kind-${record.kind}`}>
                {getPrimaryGlyph(record)}
              </span>
              <span className="pinned-chip__meta">
                <strong>{record.name}</strong>
                <small>{formatCodePoint(record.cp)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state pinned-empty">
          <h3>No pinned characters</h3>
          <p>Use the pin button in the detail panel to keep frequent symbols close by.</p>
        </div>
      )}
    </aside>
  )
}
