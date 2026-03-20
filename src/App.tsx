import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { DetailPanel } from './components/DetailPanel'
import { FeaturedSetsPanel } from './components/FeaturedSetsPanel'
import { InstallPanel } from './components/InstallPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { SearchPanel } from './components/SearchPanel'
import { useAppViewModel } from './hooks/useAppViewModel'

export default function App() {
  const { detailPanel, featuredSetsPanel, header, resultsPanel, searchPanel } = useAppViewModel()

  return (
    <div className="app-shell">
      <AppHeader
        blockCount={header.blockCount}
        indexedCharacterCount={header.indexedCharacterCount}
      />

      <InstallPanel />

      <SearchPanel {...searchPanel} />

      <main className="workspace">
        <FeaturedSetsPanel {...featuredSetsPanel} />

        <ResultsPanel model={resultsPanel.model} />

        <DetailPanel selectedDetailRecord={detailPanel.selectedDetailRecord} />
      </main>

      <AppFooter />
    </div>
  )
}
