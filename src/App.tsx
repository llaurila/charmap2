import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { InstallPanel } from './components/InstallPanel'
import { PinnedItemsPanel } from './components/PinnedItemsPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { SearchPanel } from './components/SearchPanel'
import { useAppViewModel } from './hooks/useAppViewModel'

export default function App() {
  const { detailPanel, featuredSetsPanel, header, pinnedPanel, resultsPanel, searchPanel } =
    useAppViewModel()

  return (
    <div className="app-shell">
      <AppHeader
        blockCount={header.blockCount}
        indexedCharacterCount={header.indexedCharacterCount}
      />

      <InstallPanel />

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
