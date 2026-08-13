/// <reference types="vite/client" />

import type { QrAppApi } from "@shared/contracts"

declare global {
  interface Window {
    qrApp: QrAppApi
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }

  interface ImportMetaEnv {
    readonly VITE_APP_VERSION?: string
  }
}

export {}
