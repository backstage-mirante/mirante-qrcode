import { stat } from "node:fs/promises"
import path from "node:path"

import type { BrowserWindow } from "electron"
import { app, dialog, ipcMain, shell } from "electron"

import type { GenerateRequest, InputFile, InputKind } from "../shared/contracts"
import { processQrFiles, validateInputPaths } from "./qr-service"

function kindFromPath(filePath: string): InputKind {
  return path.extname(filePath).toLowerCase() === ".txt" ? "txt" : "xlsx"
}

async function describeFile(filePath: string): Promise<InputFile> {
  const info = await stat(filePath)
  return {
    path: filePath,
    name: path.basename(filePath),
    size: info.size,
    kind: kindFromPath(filePath),
  }
}

function isSafeRevealPath(filePath: string): boolean {
  return [".png", ".zip"].includes(path.extname(filePath).toLowerCase())
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    packaged: app.isPackaged,
    defaultOutputDirectory: path.join(app.getPath("downloads"), "Mirante QR"),
  }))

  ipcMain.handle("files:select", async () => {
    const window = getWindow()
    if (!window) return []

    const result = await dialog.showOpenDialog(window, {
      title: "Selecione arquivos para gerar QR codes",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Arquivos compatíveis", extensions: ["txt", "xlsx"] },
        { name: "Planilhas", extensions: ["xlsx"] },
        { name: "Listas de URLs", extensions: ["txt"] },
      ],
    })

    if (result.canceled) return []
    const paths = validateInputPaths(result.filePaths)
    return Promise.all(paths.map(describeFile))
  })

  ipcMain.handle("files:describe", async (_event, paths: string[]) => {
    if (!Array.isArray(paths)) throw new Error("Lista de arquivos inválida.")
    return Promise.all(validateInputPaths(paths).map(describeFile))
  })

  ipcMain.handle("output:select", async () => {
    const window = getWindow()
    if (!window) return undefined
    const result = await dialog.showOpenDialog(window, {
      title: "Escolha onde salvar os QR codes",
      defaultPath: path.join(app.getPath("downloads"), "Mirante QR"),
      properties: ["openDirectory", "createDirectory"],
    })
    return result.canceled ? undefined : result.filePaths[0]
  })

  ipcMain.handle(
    "qrcode:generate",
    async (_event, request: GenerateRequest) => {
      if (!request || !Array.isArray(request.paths)) {
        throw new Error("Solicitação inválida.")
      }

      const outputRoot = request.outputRoot?.trim()
        ? path.resolve(request.outputRoot)
        : path.join(app.getPath("downloads"), "Mirante QR")

      return processQrFiles({
        paths: request.paths,
        outputRoot,
        onProgress: (progress) =>
          getWindow()?.webContents.send("qrcode:progress", progress),
      })
    },
  )

  ipcMain.handle("shell:open-output", async (_event, directory: string) => {
    if (!directory.trim()) throw new Error("Pasta inválida.")
    const result = await shell.openPath(path.resolve(directory))
    if (result) throw new Error(result)
  })

  ipcMain.handle("shell:reveal-file", (_event, filePath: string) => {
    if (!filePath.trim() || !isSafeRevealPath(filePath)) {
      throw new Error("Arquivo inválido.")
    }
    shell.showItemInFolder(path.resolve(filePath))
  })
}
