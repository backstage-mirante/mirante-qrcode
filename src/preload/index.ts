import { contextBridge, ipcRenderer, webUtils } from "electron"

import type {
  AppInfo,
  GenerateRequest,
  GenerationProgress,
  GenerationSummary,
  InputFile,
  QrAppApi,
  UpdateState,
} from "../shared/contracts"

const api: QrAppApi = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke("app:info"),
  selectFiles: (): Promise<InputFile[]> => ipcRenderer.invoke("files:select"),
  describeDroppedFiles: (files: File[]): Promise<InputFile[]> => {
    const paths = files
      .map((file) => webUtils.getPathForFile(file))
      .filter(Boolean)
    return ipcRenderer.invoke("files:describe", paths)
  },
  selectOutputDirectory: (): Promise<string | undefined> =>
    ipcRenderer.invoke("output:select"),
  generate: (request: GenerateRequest): Promise<GenerationSummary> =>
    ipcRenderer.invoke("qrcode:generate", request),
  openOutputDirectory: (directory: string): Promise<void> =>
    ipcRenderer.invoke("shell:open-output", directory),
  revealFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke("shell:reveal-file", filePath),
  checkForUpdates: (): Promise<UpdateState> =>
    ipcRenderer.invoke("updates:check"),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke("updates:download"),
  installUpdate: (): Promise<void> => ipcRenderer.invoke("updates:install"),
  onGenerationProgress: (callback: (progress: GenerationProgress) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: GenerationProgress,
    ) => callback(progress)
    ipcRenderer.on("qrcode:progress", listener)
    return () => ipcRenderer.removeListener("qrcode:progress", listener)
  },
  onUpdateState: (callback: (state: UpdateState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: UpdateState) =>
      callback(state)
    ipcRenderer.on("updates:state", listener)
    return () => ipcRenderer.removeListener("updates:state", listener)
  },
}

contextBridge.exposeInMainWorld("qrApp", api)
