import { UNICODE_VERSION } from '../constants/unicode'

type AppHeaderProps = {
  blockCount: number
  indexedCharacterCount: number
}

export function AppHeader({ blockCount, indexedCharacterCount }: AppHeaderProps) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Unicode {UNICODE_VERSION}</p>
        <h1>Charmap2</h1>
        <p className="hero-copy">
          A static Unicode character map with build-time data generation, fast search, and lazy
          detail loading by block.
        </p>
      </div>
      <div className="hero-metrics" aria-label="Project goals">
        <span>{indexedCharacterCount.toLocaleString()} indexed characters</span>
        <span>{blockCount.toLocaleString()} block files</span>
      </div>
    </header>
  )
}
