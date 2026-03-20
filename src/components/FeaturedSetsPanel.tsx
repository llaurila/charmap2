import { UNICODE_VERSION } from '../constants/unicode'
import type { FeaturedSetItem } from '../hooks/useAppViewModel'

type FeaturedSetsPanelProps = {
  activeSet: string | undefined
  isReady: boolean
  items: FeaturedSetItem[]
  loadError: string | null
  onSelectSet: (setId: string | undefined) => void
}

export function FeaturedSetsPanel({
  activeSet,
  isReady,
  items,
  loadError,
  onSelectSet,
}: FeaturedSetsPanelProps) {
  return (
    <aside className="panel side-panel">
      <div className="panel-heading">
        <h2>Featured Sets</h2>
        <p>Spec-driven shortcuts for high-frequency symbol families.</p>
      </div>

      <div className="chip-list">
        <button
          type="button"
          className={activeSet === undefined ? 'chip is-active' : 'chip'}
          onClick={() => onSelectSet(undefined)}
          disabled={!isReady}
        >
          <span>All characters</span>
        </button>

        {items.map((set) => {
          return (
            <button
              key={set.id}
              type="button"
              className={activeSet === set.id ? 'chip is-active' : 'chip'}
              onClick={() => onSelectSet(set.id)}
              disabled={!isReady}
            >
              <span>{set.label}</span>
              <small>{set.count.toLocaleString()}</small>
            </button>
          )
        })}
      </div>

      <div className="note-card">
        <h3>Data source</h3>
        <p>
          Generated from vendored UCD files in `vendor/unicode/{UNICODE_VERSION}/` and served as
          static JSON from `public/unicode/{UNICODE_VERSION}/`.
        </p>
      </div>

      {loadError ? (
        <div className="note-card note-error">
          <h3>Load issue</h3>
          <p>{loadError}</p>
        </div>
      ) : null}
    </aside>
  )
}
