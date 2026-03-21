import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { InstallPanel } from './components/InstallPanel'
import { PinnedItemsPanel } from './components/PinnedItemsPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { SearchPanel } from './components/SearchPanel'
import { UpdatePanel } from './components/UpdatePanel'
import { useAppViewModel } from './hooks/useAppViewModel'
import { useUpdateCheck } from './hooks/useUpdateCheck'

export default function App() {
  const { detailPanel, featuredSetsPanel, header, pinnedPanel, resultsPanel, searchPanel } =
    useAppViewModel()
  const updateCheck = useUpdateCheck()

  return (
    <div className="app-shell">
      <AppHeader
        blockCount={header.blockCount}
        indexedCharacterCount={header.indexedCharacterCount}
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

      <SearchPanel {...searchPanel} />

      <main className="workspace">
        <div className="side-rail">
          <PinnedItemsPanel {...pinnedPanel} />
          <FeaturedSetsPanel {...featuredSetsPanel} />
        </div>

        <ResultsPanel model={resultsPanel.model} />

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
