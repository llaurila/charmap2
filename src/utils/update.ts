import { APP_BUILD_ID, APP_VERSION } from '../constants/app'

export type BuildMetadata = {
  buildId: string
  version: string
}

export const BUILD_METADATA_FILE_NAME = 'build-meta.json'
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000

export const CURRENT_BUILD_METADATA: BuildMetadata = {
  buildId: APP_BUILD_ID,
  version: APP_VERSION,
}

export const isBuildMetadata = (value: unknown): value is BuildMetadata => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const metadata = value as Partial<BuildMetadata>

  return (
    typeof metadata.buildId === 'string' &&
    metadata.buildId.trim().length > 0 &&
    typeof metadata.version === 'string' &&
    metadata.version.trim().length > 0
  )
}

export const hasBuildUpdate = (current: BuildMetadata, remote: BuildMetadata): boolean =>
  current.buildId !== remote.buildId || current.version !== remote.version

export const createBuildMetadataUrl = (
  cacheBust: number,
  {
    baseUrl = import.meta.env.BASE_URL,
    origin = window.location.origin,
  }: { baseUrl?: string; origin?: string } = {},
): string => new URL(`${BUILD_METADATA_FILE_NAME}?t=${cacheBust}`, new URL(baseUrl, origin)).toString()

export const reloadWindow = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.location.reload()
}
