import type {
  GenerationProgress,
  InputFile,
  InputKind,
  QrAppApi,
  UpdateState,
} from "@shared/contracts"

import { processQrFilesInBrowser } from "./web-qr-service"

const selectedFiles = new Map<string, File>()
const generatedArchives = new Map<string, { blob: Blob; filename: string }>()
const progressListeners = new Set<(progress: GenerationProgress) => void>()
const updateListeners = new Set<(state: UpdateState) => void>()

function kindFromName(name: string): InputKind {
  return /\.txt$/i.test(name) ? "txt" : "xlsx"
}

function describeFile(file: File): InputFile {
  const path = `web:${file.name}:${file.size}:${file.lastModified}`
  selectedFiles.set(path, file)
  return {
    path,
    name: file.name,
    size: file.size,
    kind: kindFromName(file.name),
  }
}

function supportedFiles(files: File[]): File[] {
  return files.filter((file) => /\.(txt|xlsx)$/i.test(file.name)).slice(0, 100)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

async function selectFiles(): Promise<InputFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.xlsx"
    input.multiple = true

    const finish = (): void => {
      resolve(supportedFiles(Array.from(input.files ?? [])).map(describeFile))
      input.remove()
    }

    input.addEventListener("change", finish, { once: true })
    input.addEventListener("cancel", () => resolve([]), { once: true })
    input.click()
  })
}

function emitProgress(progress: GenerationProgress): void {
  for (const listener of progressListeners) listener(progress)
}

function emitUpdate(state: UpdateState): void {
  for (const listener of updateListeners) listener(state)
}

export const webQrApp: QrAppApi = {
  getAppInfo: async () => ({
    version: import.meta.env.VITE_APP_VERSION ?? "web",
    packaged: true,
    defaultOutputDirectory: "Download automático do navegador",
    platform: "web",
  }),
  selectFiles,
  describeDroppedFiles: async (files) =>
    supportedFiles(files).map(describeFile),
  selectOutputDirectory: async () => "Download automático do navegador",
  generate: async (request) => {
    const files = request.paths
      .map((path) => selectedFiles.get(path))
      .filter((file): file is File => Boolean(file))
    const result = await processQrFilesInBrowser({
      files,
      onProgress: emitProgress,
    })
    generatedArchives.set(result.summary.outputDirectory, {
      blob: result.zipBlob,
      filename: result.zipFilename,
    })
    downloadBlob(result.zipBlob, result.zipFilename)
    return result.summary
  },
  openOutputDirectory: async (directory) => {
    const archive = generatedArchives.get(directory)
    if (!archive) throw new Error("O arquivo ZIP não está mais disponível.")
    downloadBlob(archive.blob, archive.filename)
  },
  revealFile: async (filePath) => {
    downloadDataUrl(filePath, "qrcode.png")
  },
  checkForUpdates: async () => {
    emitUpdate({ status: "checking" })
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.update()
    const state = { status: "not-available" } satisfies UpdateState
    emitUpdate(state)
    return state
  },
  downloadUpdate: async () => undefined,
  installUpdate: async () => window.location.reload(),
  onGenerationProgress: (callback) => {
    progressListeners.add(callback)
    return () => progressListeners.delete(callback)
  },
  onUpdateState: (callback) => {
    updateListeners.add(callback)
    return () => updateListeners.delete(callback)
  },
}
