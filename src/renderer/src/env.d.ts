/// <reference types="vite/client" />

import type { QrAppApi } from "../../preload"

declare global {
  interface Window {
    qrApp: QrAppApi
  }
}

export {}
