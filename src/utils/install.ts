export type InstallSurface = 'chromium' | 'ios' | 'safari-macos' | 'other'

export type InstallNavigatorSnapshot = {
  maxTouchPoints: number
  platform: string
  userAgent: string
  vendor: string
}

export type DisplayModeSnapshot = {
  minimalUi: boolean
  navigatorStandalone?: boolean
  standalone: boolean
}

export const isInstalledDisplayMode = ({
  minimalUi,
  navigatorStandalone,
  standalone,
}: DisplayModeSnapshot): boolean =>
  standalone || minimalUi || navigatorStandalone === true

const isIOSSurface = ({
  maxTouchPoints,
  platform,
  userAgent,
}: Pick<InstallNavigatorSnapshot, 'maxTouchPoints' | 'platform' | 'userAgent'>): boolean => {
  const isiPadOS = platform === 'MacIntel' && maxTouchPoints > 1
  return /iPhone|iPad|iPod/.test(userAgent) || isiPadOS
}

const isSafariSurface = ({
  userAgent,
  vendor,
}: Pick<InstallNavigatorSnapshot, 'userAgent' | 'vendor'>): boolean =>
  /Safari/.test(userAgent) &&
  !/Chrome|Chromium|Edg|OPR|OPT|SamsungBrowser|Firefox/.test(userAgent) &&
  vendor.includes('Apple')

const isChromiumSurface = ({ userAgent }: Pick<InstallNavigatorSnapshot, 'userAgent'>): boolean =>
  /Chrome|Chromium|Edg|OPR|SamsungBrowser/.test(userAgent)

export const getInstallSurface = ({
  maxTouchPoints,
  platform,
  userAgent,
  vendor,
}: InstallNavigatorSnapshot): InstallSurface => {
  if (isIOSSurface({ maxTouchPoints, platform, userAgent })) {
    return 'ios'
  }

  if (isSafariSurface({ userAgent, vendor }) && /Macintosh/.test(userAgent)) {
    return 'safari-macos'
  }

  if (isChromiumSurface({ userAgent })) {
    return 'chromium'
  }

  return 'other'
}
