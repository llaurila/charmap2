import { useEffect, useId, useRef, useState } from 'react'
import { UNICODE_VERSION } from '../constants/unicode'
import type { AppMode, InspectorFilter } from '../types/unicode'

type InspectorCopyAction = {
  id: 'raw' | 'code-points' | 'javascript' | 'html'
  label: string
  value: string
}

type AppHeaderProps = {
  appMode: AppMode
  blockCount: number
  indexedCharacterCount: number
  inspectorInput: string
  onAppModeChange: (mode: AppMode) => void
  onInspectorInputChange: (value: string) => void
  onInspectorReset: () => void
  inspectorMenu?: {
    actions: InspectorCopyAction[]
    filter: InspectorFilter
    hasInput: boolean
    isOpen: boolean
    onCopyAction: (action: InspectorCopyAction) => Promise<void>
    onSelectFilter: (filter: InspectorFilter) => void
    onToggle: () => void
  }
}

const filterOptions: Array<{ id: InspectorFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'invisible', label: 'Invisible' },
]

const getModeSwitchButtonClassName = (
  isActive: boolean,
): string =>
  isActive
    ? 'ghost-button hero-mode-switch__button is-active'
    : 'ghost-button hero-mode-switch__button'

const getInspectorMenuTriggerClassName = (isOpen: boolean): string =>
  isOpen
    ? 'ghost-button hero-inspector-bar__button overflow-menu__trigger is-active'
    : 'ghost-button hero-inspector-bar__button overflow-menu__trigger'

export function AppHeader({
  appMode,
  blockCount,
  indexedCharacterCount,
  inspectorInput,
  inspectorMenu,
  onAppModeChange,
  onInspectorInputChange,
  onInspectorReset,
}: AppHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()
  const inspectorMenuId = useId()
  const inspectorTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (appMode === 'inspector') {
      inspectorTextareaRef.current?.focus()
    }
  }, [appMode])

  return (
    <header className={isExpanded ? 'hero is-expanded' : 'hero'}>
      <div className="hero-main">
        <div className="hero-title-row">
          <div className="hero-title-block">
            <h1>Charmap2</h1>
            <div className="hero-mode-switch" aria-label="Primary app mode">
              <button
                type="button"
                className={getModeSwitchButtonClassName(appMode === 'search')}
                onClick={() => onAppModeChange('search')}
              >
                Search
              </button>
              <button
                type="button"
                className={getModeSwitchButtonClassName(appMode === 'inspector')}
                onClick={() => onAppModeChange('inspector')}
              >
                Text Inspector
              </button>
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
            A static Unicode character map with build-time data generation, fast search, and lazy
            detail loading by block.
          </p>
        </div>
        {appMode === 'inspector' && inspectorMenu ? (
          <div className="hero-inspector-bar">
            <div className="hero-inspector-bar__top">
              <div className="hero-inspector-bar__copy">
                <p className="eyebrow">Text Inspector Active</p>
                <p className="hero-copy">
                  Paste text here to inspect code points, copy escaped forms,
                  and filter suspicious or invisible characters.
                </p>
              </div>
              <div className="hero-inspector-bar__actions">
                <button
                  type="button"
                  className="ghost-button hero-inspector-bar__button"
                  onClick={onInspectorReset}
                  disabled={inspectorInput.length === 0}
                >
                  Clear text
                </button>
                <div className="overflow-menu hero-overflow-menu">
                  <button
                    type="button"
                    className={getInspectorMenuTriggerClassName(inspectorMenu.isOpen)}
                    aria-controls={inspectorMenuId}
                    aria-expanded={inspectorMenu.isOpen}
                    aria-haspopup="menu"
                    onClick={inspectorMenu.onToggle}
                  >
                    Inspector Actions...
                  </button>
                  {inspectorMenu.isOpen ? (
                    <div
                      id={inspectorMenuId}
                      className="overflow-menu__content"
                      role="menu"
                      aria-label="Text inspector actions"
                    >
                      <div className="overflow-menu__section">
                        {inspectorMenu.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            role="menuitem"
                            className="overflow-menu__item"
                            onClick={async () => {
                              await inspectorMenu.onCopyAction(action)
                            }}
                            disabled={!inspectorMenu.hasInput}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                      <div className="overflow-menu__section">
                        {filterOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={inspectorMenu.filter === option.id}
                            className={
                              inspectorMenu.filter === option.id
                                ? 'overflow-menu__item is-active'
                                : 'overflow-menu__item'
                            }
                            onClick={() => inspectorMenu.onSelectFilter(option.id)}
                          >
                            Show {option.label.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <label className="hero-inspector-input">
              <span className="sr-only">Text to inspect</span>
              <textarea
                ref={inspectorTextareaRef}
                value={inspectorInput}
                rows={5}
                placeholder={
                  'Paste text here to inspect spaces, joins, controls, '
                  + 'combining marks, and code points.'
                }
                onChange={(event) => onInspectorInputChange(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
      <div className="hero-metrics" aria-label="Project goals">
        <span>{indexedCharacterCount.toLocaleString()} indexed characters</span>
        <span>{blockCount.toLocaleString()} block files</span>
      </div>
    </header>
  )
}
