import { useCallback, useMemo } from 'react'
import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { InstallPanel } from './components/InstallPanel'
import { PinnedItemsPanel } from './components/PinnedItemsPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { SearchPanel } from './components/SearchPanel'
import { TextInspectorPanel } from './components/TextInspectorPanel'
import { UpdatePanel } from './components/UpdatePanel'
import { useAppViewModel } from './hooks/useAppViewModel'
import { useUpdateCheck } from './hooks/useUpdateCheck'

const MOBILE_MEDIA_QUERY = '(max-width: 840px)'

const shouldAutoScrollDetailPanel = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
  }

  return window.innerWidth <= 840
}

const scrollDetailPanelIntoView = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  const detailPanel = document.querySelector<HTMLElement>('.detail-panel')

  if (!detailPanel) {
    return
  }

  const pinnedPanel = document.querySelector<HTMLElement>('.pinned-panel')
  const detailPanelTop = window.scrollY + detailPanel.getBoundingClientRect().top
  const stickyOffset = pinnedPanel
    ? Math.max(0, pinnedPanel.getBoundingClientRect().bottom + 12)
    : 0

  window.scrollTo({
    top: Math.max(0, detailPanelTop - stickyOffset),
    behavior: 'smooth',
  })
}

export default function App() {
  const {
    appMode,
    detailPanel,
    featuredSetsPanel,
    header,
    pinnedPanel,
    resultsPanel,
    searchPanel,
    textInspector,
  } = useAppViewModel()
  const updateCheck = useUpdateCheck()

  const handleSelectPinned = useCallback(
    (cp: number): void => {
      pinnedPanel.onSelectPinned(cp)

      if (shouldAutoScrollDetailPanel()) {
        scrollDetailPanelIntoView()
      }
    },
    [pinnedPanel],
  )

  const resultsPanelModel = useMemo(
    () => ({
      ...resultsPanel.model,
      body: {
        ...resultsPanel.model.body,
        onSelectResult: (cp: number, shouldFocus?: boolean) => {
          resultsPanel.model.body.onSelectResult(cp, shouldFocus)

          if (shouldAutoScrollDetailPanel()) {
            scrollDetailPanelIntoView()
          }
        },
      },
    }),
    [resultsPanel.model],
  )

  return (
    <div className="app-shell">
      <AppHeader
        appMode={header.appMode}
        blockCount={header.blockCount}
        indexedCharacterCount={header.indexedCharacterCount}
        inspectorInput={header.inspectorInput}
        inspectorMenu={header.inspectorMenu}
        onAppModeChange={searchPanel.onAppModeChange}
        onInspectorInputChange={header.onInspectorInputChange}
        onInspectorReset={header.onInspectorReset}
      />

      <InstallPanel />

      <UpdatePanel
        currentBuildId={updateCheck.currentBuildId}
        currentVersion={updateCheck.currentVersion}
        isUpdateAvailable={updateCheck.isUpdateAvailable}
        latestBuildId={updateCheck.latestBuildId}
        latestVersion={updateCheck.latestVersion}
        onDismiss={updateCheck.acknowledgeUpdate}
        onReload={updateCheck.reloadToUpdate}
      />

      <main className="workspace" data-app-mode={appMode}>
        <PinnedItemsPanel
          items={pinnedPanel.items}
          onSelectPinned={handleSelectPinned}
          selectedCp={pinnedPanel.selectedCp}
        />
        <div className="workspace-main">
          <SearchPanel {...searchPanel} />
          {appMode === 'search' ? (
            <ResultsPanel model={resultsPanelModel} />
          ) : (
            <TextInspectorPanel
              announceMessage={textInspector.announceMessage}
              copiedLabel={textInspector.copiedLabel}
              filterLabel={textInspector.filterLabel}
              onJumpToWarning={(warning) => {
                textInspector.onJumpToWarning(warning)

                if (shouldAutoScrollDetailPanel()) {
                  scrollDetailPanelIntoView()
                }
              }}
              onReset={textInspector.onReset}
              onSelectUnit={(unit) => {
                textInspector.onSelectUnit(unit)

                if (shouldAutoScrollDetailPanel()) {
                  scrollDetailPanelIntoView()
                }
              }}
              selectedIndex={textInspector.selectedIndex}
              summary={textInspector.summary}
              visibleUnits={textInspector.visibleUnits}
              warnings={textInspector.warnings}
            />
          )}
        </div>
        <FeaturedSetsPanel {...featuredSetsPanel} />
        <DetailPanel
          isPinned={detailPanel.isPinned}
          onTogglePinned={detailPanel.onTogglePinned}
          selectedDetailRecord={detailPanel.selectedDetailRecord}
        />
      </main>

      <AppFooter />
    </div>
  )
}
