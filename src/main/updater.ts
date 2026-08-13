import type { BrowserWindow } from "electron"
import { app, ipcMain } from "electron"
import electronUpdater from "electron-updater"

import type { UpdateState } from "../shared/contracts"

const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1_000
const { autoUpdater } = electronUpdater

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível verificar a atualização."
}

export function configureUpdater(getWindow: () => BrowserWindow | null): void {
  const send = (state: UpdateState): void => {
    getWindow()?.webContents.send("updates:state", state)
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on("checking-for-update", () => send({ status: "checking" }))
  autoUpdater.on("update-available", (info) =>
    send({ status: "available", version: info.version }),
  )
  autoUpdater.on("update-not-available", () =>
    send({ status: "not-available" }),
  )
  autoUpdater.on("download-progress", (progress) =>
    send({ status: "downloading", percent: progress.percent }),
  )
  autoUpdater.on("update-downloaded", (info) =>
    send({ status: "downloaded", version: info.version }),
  )
  autoUpdater.on("error", (error) =>
    send({ status: "error", message: errorMessage(error) }),
  )

  ipcMain.handle("updates:check", async () => {
    if (!app.isPackaged)
      return { status: "not-available" } satisfies UpdateState
    await autoUpdater.checkForUpdates()
    return { status: "checking" } satisfies UpdateState
  })
  ipcMain.handle("updates:download", async () => {
    await autoUpdater.downloadUpdate()
  })
  ipcMain.handle("updates:install", () => {
    autoUpdater.quitAndInstall(false, true)
  })

  if (app.isPackaged) {
    setTimeout(() => void autoUpdater.checkForUpdates(), 5_000)
    setInterval(() => void autoUpdater.checkForUpdates(), UPDATE_INTERVAL_MS)
  }
}
