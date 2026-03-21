import { useCallback, useEffect, useMemo, useState } from 'react'
import { getInstallSurface, isInstalledDisplayMode } from '../utils/install'

type UseInstallPromptResult = {
  deferredInstallPrompt: BeforeInstallPromptEvent | null
  dismissInstallPanel: () => void
  handleInstallClick: () => Promise<void>
  installSurface: ReturnType<typeof getInstallSurface>
  shouldShowInstallPanel: boolean
}

const getInstalledState = (): boolean =>
  isInstalledDisplayMode({
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    minimalUi: window.matchMedia('(display-mode: minimal-ui)').matches,
    navigatorStandalone: navigator.standalone,
  })

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(getInstalledState)
  const [isDismissed, setIsDismissed] = useState(false)
  const installSurface = useMemo(
    () =>
      getInstallSurface({
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
      }),
    [],
  )

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)')

    const updateInstalledState = (): void => {
      setIsInstalled(
        isInstalledDisplayMode({
          standalone: standaloneQuery.matches,
          minimalUi: minimalUiQuery.matches,
          navigatorStandalone: navigator.standalone,
        }),
      )
    }

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    const handleAppInstalled = (): void => {
      setIsInstalled(true)
      setDeferredInstallPrompt(null)
    }

    updateInstalledState()
    standaloneQuery.addEventListener('change', updateInstalledState)
    minimalUiQuery.addEventListener('change', updateInstalledState)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      standaloneQuery.removeEventListener('change', updateInstalledState)
      minimalUiQuery.removeEventListener('change', updateInstalledState)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const dismissInstallPanel = useCallback((): void => {
    setIsDismissed(true)
  }, [])

  const handleInstallClick = useCallback(async (): Promise<void> => {
    if (!deferredInstallPrompt) {
      return
    }

    const promptEvent = deferredInstallPrompt
    setDeferredInstallPrompt(null)
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice

    if (choice.outcome !== 'accepted') {
      setDeferredInstallPrompt(promptEvent)
    }
  }, [deferredInstallPrompt])

  return {
    deferredInstallPrompt,
    dismissInstallPanel,
    handleInstallClick,
    installSurface,
    shouldShowInstallPanel:
      !isDismissed &&
      !isInstalled &&
      (installSurface !== 'chromium' || deferredInstallPrompt !== null),
  }
}
