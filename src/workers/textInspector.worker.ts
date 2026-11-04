import type { SearchRecord } from '../types/unicode'
import { analyzeText, buildInspectorSummary } from '../utils/textInspector'
import { buildInspectorFindings } from '../utils/textInspectorFindings'

self.onmessage = (event: MessageEvent<{ input: string; records: SearchRecord[] }>) => {
  const units = analyzeText(event.data.input, event.data.records)
  const findings = buildInspectorFindings(units)
  self.postMessage({ units, findings, summary: buildInspectorSummary(units, findings) })
}
