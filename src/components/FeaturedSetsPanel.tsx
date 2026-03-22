import { UNICODE_VERSION } from '../constants/unicode'
import type { FeaturedSetItem } from '../hooks/useAppViewModel'
import type { AppMode } from '../types/unicode'

type FeaturedSetsPanelProps = {
  appMode: AppMode
  activeSet: string | undefined
  isReady: boolean
  items: FeaturedSetItem[]
  loadError: string | null
  onSelectSet: (setId: string | undefined) => void
}

export function FeaturedSetsPanel({
  appMode,
  activeSet,
  isReady,
  items,
  loadError,
  onSelectSet,
}: FeaturedSetsPanelProps) {
  if (appMode === 'inspector') {
    return (
      <aside className="panel side-panel">
        <div className="panel-heading">
          <h2>Inspector Notes</h2>
          <p>
            Use Text Inspector to break pasted text into code points and jump
            into the detail panel.
          </p>
        </div>

        <div className="note-card">
          <h3>Best for</h3>
          <p>
            Zero-width characters, unusual spaces, controls, combining marks,
            and debugging copied text.
          </p>
        </div>

        <div className="note-card">
          <h3>Current focus</h3>
          <p>
            Version one is code-point-first, with compact rows, warnings, and
            shared detail inspection.
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
