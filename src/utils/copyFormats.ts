type CopyableRecord = {
  cp: number
}

export type CopyFormat = {
  id: 'raw' | 'code-point' | 'javascript' | 'css' | 'html'
  label: string
  value: string
}

export const formatCodePoint = (cp: number): string => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`

const formatJavaScriptEscape = (cp: number): string => {
  if (cp <= 0xffff) {
    return `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`
  }

  return `\\u{${cp.toString(16).toUpperCase()}}`
}

const formatCssEscape = (cp: number): string => `\\${cp.toString(16).toUpperCase()} `

const formatHtmlEntity = (cp: number): string => `&#x${cp.toString(16).toUpperCase()};`

export const getCopyFormats = (record: CopyableRecord): CopyFormat[] => [
  {
    id: 'raw',
    label: 'Character',
    value: String.fromCodePoint(record.cp),
  },
  {
    id: 'code-point',
    label: 'Code Point',
    value: formatCodePoint(record.cp),
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    value: formatJavaScriptEscape(record.cp),
  },
  {
    id: 'css',
    label: 'CSS',
    value: formatCssEscape(record.cp),
  },
  {
    id: 'html',
    label: 'HTML',
    value: formatHtmlEntity(record.cp),
  },
]
