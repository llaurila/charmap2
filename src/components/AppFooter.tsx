import { APP_VERSION } from '../constants/app'

export function AppFooter() {
  return (
    <footer className="app-footer">
      Charmap2 v{APP_VERSION} - © Copyright 2026 Vincent Laurila
      <details className="privacy-note">
        <summary>Privacy</summary>
        <p>
          The official site uses{' '}
          <a href="https://www.goatcounter.com/help/privacy">GoatCounter</a> for
          cookieless usage statistics, including approximate visitor counts,
          countries, and browser/device information. Your IP address is processed
          to estimate location and distinguish visits, but is not persisted in
          the analytics database. Search
          text, inspected text, clipboard contents, URL parameters, and referrers
          are not sent to analytics.
        </p>
      </details>
    </footer>
  )
}
