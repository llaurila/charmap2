import type { ResultsPanelViewModel } from '../hooks/useResultsPanelViewModel'
import { ResultsPanelBody } from './ResultsPanelBody'
import { ResultsPanelHeader } from './ResultsPanelHeader'

type ResultsPanelProps = {
  model: ResultsPanelViewModel
}

export function ResultsPanel({ model }: ResultsPanelProps) {
  return (
    <section className="panel results-panel">
      <ResultsPanelHeader {...model.header} />
      <ResultsPanelBody {...model.body} />
    </section>
  )
}
