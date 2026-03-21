import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CURRENT_BUILD_METADATA,
  UPDATE_CHECK_INTERVAL_MS,
  type BuildMetadata,
  createBuildMetadataUrl,
  hasBuildUpdate,
  isBuildMetadata,
  reloadWindow,
} from '../utils/update'

type UseUpdateCheckResult = {
  acknowledgeUpdate: () => void
  currentBuildId: string
  currentVersion: string
  isUpdateAvailable: boolean
  latestBuildId: string | null
  latestVersion: string | null
  reloadToUpdate: () => void
}

const VISIBILITY_STATE_VISIBLE = 'visible'

const isDismissedUpdate = (latest: BuildMetadata, dismissed: BuildMetadata | null): boolean =>
  dismissed?.buildId === latest.buildId && dismissed?.version === latest.version

export function useUpdateCheck(): UseUpdateCheckResult {
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const lastCheckAtRef = useRef<number>(0)
  const dismissedUpdateRef = useRef<BuildMetadata | null>(null)

  const checkForUpdate = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const response = await fetch(createBuildMetadataUrl(Date.now()), {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        return
      }

      const payload = (await response.json()) as unknown

      if (!isBuildMetadata(payload)) {
        return
      }

      if (hasBuildUpdate(CURRENT_BUILD_METADATA, payload)) {
        setLatestBuildId(payload.buildId)
        setLatestVersion(payload.version)
        setIsUpdateAvailable(!isDismissedUpdate(payload, dismissedUpdateRef.current))
        return
      }

      dismissedUpdateRef.current = null
      setLatestBuildId(null)
      setLatestVersion(null)
      setIsUpdateAvailable(false)
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const runCheck = (force = false): void => {
      if (!force && document.visibilityState !== VISIBILITY_STATE_VISIBLE) {
        return
      }

      lastCheckAtRef.current = Date.now()
      void checkForUpdate()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== VISIBILITY_STATE_VISIBLE) {
        return
      }

      if (Date.now() - lastCheckAtRef.current < UPDATE_CHECK_INTERVAL_MS) {
        return
      }

      runCheck()
    }

    runCheck(true)
    const interval = window.setInterval(runCheck, UPDATE_CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForUpdate])

  const acknowledgeUpdate = useCallback((): void => {
    if (latestBuildId && latestVersion) {
      dismissedUpdateRef.current = {
        buildId: latestBuildId,
        version: latestVersion,
      }
    }

    setIsUpdateAvailable(false)
  }, [latestBuildId, latestVersion])

  const reloadToUpdate = useCallback((): void => {
    reloadWindow()
  }, [])

  return useMemo(
    () => ({
      acknowledgeUpdate,
      currentBuildId: CURRENT_BUILD_METADATA.buildId,
      currentVersion: CURRENT_BUILD_METADATA.version,
      isUpdateAvailable,
      latestBuildId,
      latestVersion,
      reloadToUpdate,
    }),
    [acknowledgeUpdate, isUpdateAvailable, latestBuildId, latestVersion, reloadToUpdate],
  )
}
