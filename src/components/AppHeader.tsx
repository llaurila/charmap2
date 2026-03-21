import { useId, useState } from 'react'
import { UNICODE_VERSION } from '../constants/unicode'

type AppHeaderProps = {
  blockCount: number
  indexedCharacterCount: number
}

export function AppHeader({ blockCount, indexedCharacterCount }: AppHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()

  return (
    <header className={isExpanded ? 'hero is-expanded' : 'hero'}>
      <div className="hero-main">
        <div className="hero-title-row">
          <h1>Charmap2</h1>
          <button
            type="button"
            className="hero-toggle"
            aria-controls={detailsId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse header' : 'Expand header'}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <span aria-hidden="true">{isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
        <div id={detailsId} className="hero-details">
          <p className="eyebrow">Unicode {UNICODE_VERSION}</p>
          <p className="hero-copy">
            A static Unicode character map with build-time data generation, fast search, and lazy
            detail loading by block.
          </p>
        </div>
      </div>
      <div className="hero-metrics" aria-label="Project goals">
        <span>{indexedCharacterCount.toLocaleString()} indexed characters</span>
        <span>{blockCount.toLocaleString()} block files</span>
      </div>
    </header>
  )
}
