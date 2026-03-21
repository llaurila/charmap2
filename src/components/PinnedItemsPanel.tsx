import { useEffect, useState } from 'react'
import type { ResultRecord } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'

const MOBILE_MEDIA_QUERY = '(max-width: 840px)'

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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const updateIsMobile = (): void => {
      setIsMobile(mediaQuery.matches)
    }

    updateIsMobile()
    mediaQuery.addEventListener('change', updateIsMobile)

    return () => {
      mediaQuery.removeEventListener('change', updateIsMobile)
    }
  }, [])

  if (isMobile && items.length === 0) {
    return null
  }

  return (
    <aside className={isExpanded ? 'panel side-panel pinned-panel is-expanded' : 'panel side-panel pinned-panel'}>
      <div className="panel-heading pinned-panel__heading">
        <div className="pinned-panel__title-row">
          <h2>Pinned</h2>
          <button
            type="button"
            className="ghost-button pinned-panel__toggle"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse pinned panel' : 'Expand pinned panel'}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
        <p className="pinned-panel__description">
          Saved shortcuts stay in this browser so you can jump back fast.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="pinned-summary-list" aria-label="Pinned characters summary">
          {items.map((record) => (
            <button
              key={record.cp}
              type="button"
              className={
                selectedCp === record.cp
                  ? 'pinned-summary-chip is-active'
                  : 'pinned-summary-chip'
              }
              onClick={() => onSelectPinned(record.cp)}
              aria-label={`Show details for ${record.name}`}
            >
              <span className={`pinned-summary-chip__glyph kind-${record.kind}`}>
                {getPrimaryGlyph(record)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="pinned-summary-empty">No pinned characters</p>
      )}

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
