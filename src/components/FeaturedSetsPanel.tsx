import { UNICODE_VERSION } from '../constants/unicode'
import { featuredSets } from '../data/featuredSets'
import type { SearchRecord } from '../types/unicode'

type FeaturedSetsPanelProps = {
  activeSet: string | undefined
  isReady: boolean
  loadError: string | null
  onSelectSet: (setId: string | undefined) => void
  searchIndex: SearchRecord[]
}

export function FeaturedSetsPanel({
  activeSet,
  isReady,
  loadError,
  onSelectSet,
  searchIndex,
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

        {featuredSets.map((set) => {
          const count = searchIndex.filter((record) => record.featuredIn?.includes(set.id)).length

          return (
            <button
              key={set.id}
              type="button"
              className={activeSet === set.id ? 'chip is-active' : 'chip'}
              onClick={() => onSelectSet(set.id)}
              disabled={!isReady}
            >
              <span>{set.label}</span>
              <small>{count.toLocaleString()}</small>
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
