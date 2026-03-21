/// <reference types="vite/client" />

declare const __APP_VERSION__: string

type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<BeforeInstallPromptChoice>
  prompt(): Promise<BeforeInstallPromptChoice>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
  appinstalled: Event
}

interface Navigator {
  standalone?: boolean
}
