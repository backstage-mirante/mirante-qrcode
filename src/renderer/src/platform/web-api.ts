import type {
  GenerationProgress,
  InputFile,
  InputKind,
  QrAppApi,
  SpreadsheetAnalysis,
  UpdateState,
} from "@shared/contracts"
import { inspectWorksheetColumns } from "@shared/qr-core"
import readXlsxFile from "read-excel-file/browser"

import { processQrFilesInBrowser } from "./web-qr-service"

const selectedFiles = new Map<string, File>()
const generatedArchives = new Map<string, { blob: Blob; filename: string }>()
const progressListeners = new Set<(progress: GenerationProgress) => void>()
const updateListeners = new Set<(state: UpdateState) => void>()

function kindFromName(name: string): InputKind {
  return /\.txt$/i.test(name) ? "txt" : "xlsx"
}

async function analyzeSpreadsheet(file: File): Promise<SpreadsheetAnalysis> {
  try {
    const workbook = await readXlsxFile(file)
    return {
      sheets: workbook.flatMap((sheet) => {
        const inspection = inspectWorksheetColumns(sheet.data)
        if (!inspection.hasTabularData) return []

        const suggested = inspection.headerRows.find(
          (row) => row.index === inspection.suggestedHeaderRow,
        )
        if (!suggested) return []

        return [
          {
            sheetName: sheet.sheet,
            headerRows: inspection.headerRows,
            mapping: {
              headerRow: suggested.index,
              nameColumn: suggested.detectedNameColumn,
              lastNameColumn: suggested.detectedLastNameColumn,
              phoneColumn: suggested.detectedPhoneColumn,
            },
            manualMappingRequired:
              suggested.detectedNameColumn === undefined ||
              suggested.detectedPhoneColumn === undefined,
          },
        ]
      }),
    }
  } catch (error) {
    return {
      sheets: [],
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível analisar a planilha.",
    }
  }
}

async function describeFile(file: File): Promise<InputFile> {
  const path = `web:${file.name}:${file.size}:${file.lastModified}`
  selectedFiles.set(path, file)
  return {
    path,
    name: file.name,
    size: file.size,
    kind: kindFromName(file.name),
    spreadsheet: /\.xlsx$/i.test(file.name)
      ? await analyzeSpreadsheet(file)
      : undefined,
  }
}

function supportedFiles(files: File[]): File[] {
  return files.filter((file) => /\.(txt|xlsx)$/i.test(file.name)).slice(0, 100)
}

async function describeFiles(files: File[]): Promise<InputFile[]> {
  const described: InputFile[] = []
  for (const file of supportedFiles(files)) {
    described.push(await describeFile(file))
  }
  return described
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

    const finish = async (): Promise<void> => {
      resolve(await describeFiles(Array.from(input.files ?? [])))
      input.remove()
    }

    input.addEventListener("change", () => void finish(), { once: true })
    input.addEventListener(
      "cancel",
      () => {
        input.remove()
        resolve([])
      },
      { once: true },
    )
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
  describeDroppedFiles: describeFiles,
  selectOutputDirectory: async () => "Download automático do navegador",
  generate: async (request) => {
    const files = request.paths.flatMap((path) => {
      const file = selectedFiles.get(path)
      return file ? [{ path, file }] : []
    })
    const result = await processQrFilesInBrowser({
      files,
      spreadsheetMappings: request.spreadsheetMappings,
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
