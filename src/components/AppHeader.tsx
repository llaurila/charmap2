import { useId, useState } from 'react'
import { UNICODE_VERSION } from '../constants/unicode'
import type { AppMode } from '../types/unicode'

type AppHeaderProps = {
  appMode: AppMode
  blockCount: number
  indexedCharacterCount: number
  onAppModeChange: (mode: AppMode) => void
}

export function AppHeader({
  appMode, blockCount, indexedCharacterCount, onAppModeChange,
}: AppHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()

  return (
    <header className={isExpanded ? 'hero is-expanded' : 'hero'}>
      <div className="hero-main">
        <div className="hero-title-row">
          <div className="hero-title-block">
            <h1>Charmap2</h1>
            <div className="hero-mode-switch" aria-label="Primary app mode">
              {(['search', 'inspector'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={appMode === mode}
                  className={'ghost-button hero-mode-switch__button'
                    + (appMode === mode ? ' is-active' : '')}
                  onClick={() => onAppModeChange(mode)}
                >
                  {mode === 'search' ? 'Search' : 'Text Inspector'}
                </button>
              ))}
            </div>
          </div>
          <div className="hero-actions">
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
        </div>
        <div id={detailsId} className="hero-details">
          <p className="eyebrow">Unicode {UNICODE_VERSION}</p>
          <p className="hero-copy">
            Find Unicode characters, or inspect pasted text to understand hidden characters
            and unexpected behavior.
          </p>
        </div>
      </div>
      <div className="hero-metrics" aria-label="Unicode data">
        <span>{indexedCharacterCount.toLocaleString()} indexed characters</span>
        <span>{blockCount.toLocaleString()} block files</span>
      </div>
    </header>
  )
}
