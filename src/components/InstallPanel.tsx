import { useInstallPrompt } from '../hooks/useInstallPrompt'
import type { InstallSurface } from '../utils/install'

type InstallCopy = {
  body: string
  cta?: string
  title: string
}

const installCopy: Record<Exclude<InstallSurface, 'other'>, InstallCopy> = {
  chromium: {
    title: 'Install Charmap2',
    body:
      'Keep Charmap2 in its own window and launch it from your desktop, dock, or home screen.',
    cta: 'Install app',
  },
  ios: {
    title: 'Add to Home Screen',
    body:
      'In Safari or another iPhone/iPad browser, open Share and choose ' +
      'Add to Home Screen for an app-style shortcut.',
  },
  'safari-macos': {
    title: 'Add to Dock',
    body:
      'In Safari on macOS, use File -> Add to Dock to install Charmap2 as a standalone app.',
  },
}

export function InstallPanel() {
  const { deferredInstallPrompt, handleInstallClick, installSurface, shouldShowInstallPanel } =
    useInstallPrompt()

  if (!shouldShowInstallPanel) {
    return null
  }

  if (installSurface === 'other') {
    return null
  }

  if (installSurface === 'chromium' && deferredInstallPrompt === null) {
    return null
  }

  const copy = installCopy[installSurface]

  return (
    <aside className="panel install-panel" aria-label="Install app">
      <div className="install-panel__header">
        <p className="eyebrow">Install</p>
        <h2>{copy.title}</h2>
      </div>
      <p className="install-panel__body">{copy.body}</p>
      {copy.cta ? (
        <button type="button" className="install-button" onClick={handleInstallClick}>
          {copy.cta}
        </button>
      ) : null}
    </aside>
  )
}
