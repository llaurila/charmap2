import type { KeyboardEventHandler } from 'react'
import type { ResultRecord } from '../types/unicode'
import { formatCodePoint } from '../utils/copyFormats'
import { getPrimaryGlyph } from '../utils/rendering'

type ResultCardProps = {
  isSelected: boolean
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>
  onSelect: (cp: number) => void
  record: ResultRecord
}

export function ResultCard({ isSelected, onKeyDown, onSelect, record }: ResultCardProps) {
  return (
    <button
      id={`result-${record.cp}`}
      type="button"
      role="option"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      className={isSelected ? 'result-card is-selected' : 'result-card'}
      onClick={() => onSelect(record.cp)}
      onKeyDown={onKeyDown}
    >
      <span className={`glyph-tile kind-${record.kind}`}>{getPrimaryGlyph(record)}</span>
      <span className="result-meta">
        <strong>{record.aliases?.[0] ?? record.name}</strong>
        <span>{formatCodePoint(record.cp)}</span>
      </span>
    </button>
  )
}
