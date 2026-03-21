type UpdatePanelProps = {
  currentBuildId: string
  currentVersion: string
  isUpdateAvailable: boolean
  latestBuildId: string | null
  latestVersion: string | null
  onDismiss: () => void
  onReload: () => void
}

export function UpdatePanel({
  currentBuildId,
  currentVersion,
  isUpdateAvailable,
  latestBuildId,
  latestVersion,
  onDismiss,
  onReload,
}: UpdatePanelProps) {
  if (!isUpdateAvailable || !latestBuildId || !latestVersion) {
    return null
  }

  const buildTransitionText =
    `A newer Charmap2 build is live. Reload when you are ready to ` +
    `swap from v${currentVersion} (${currentBuildId}) to ` +
    `v${latestVersion} (${latestBuildId}).`

  return (
    <aside className="panel update-panel" aria-label="App update available">
      <div className="update-panel__header">
        <p className="eyebrow">Update ready</p>
        <h2>Reload to get the latest build</h2>
      </div>

      <p className="update-panel__body">{buildTransitionText}</p>

      <div className="update-panel__actions">
        <button type="button" className="install-button" onClick={onReload}>
          Reload now
        </button>
        <button type="button" className="ghost-button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  )
}
