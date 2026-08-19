import JSZip from "jszip"
import QRCode from "qrcode"
import readXlsxFile from "read-excel-file/browser"

import type {
  GeneratedQrCode,
  GenerationProgress,
  GenerationSummary,
  GenerationWarning,
  SpreadsheetMappingRequest,
} from "@shared/contracts"
import {
  parseManualUrlEntries,
  parseTextEntries,
  parseWorksheetEntries,
  timestamp,
  uniqueFilename,
  validateManualUrls,
} from "@shared/qr-core"
import type { QrEntry } from "@shared/qr-core"

interface ProcessBrowserOptions {
  files: BrowserInputFile[]
  urls?: string[]
  spreadsheetMappings?: SpreadsheetMappingRequest[]
  onProgress?: (progress: GenerationProgress) => void
  now?: Date
}

export interface BrowserInputFile {
  path: string
  file: File
}

export interface BrowserGenerationResult {
  summary: GenerationSummary
  zipBlob: Blob
  zipFilename: string
}

function pngBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

export async function processQrFilesInBrowser({
  files,
  urls,
  spreadsheetMappings = [],
  onProgress,
  now = new Date(),
}: ProcessBrowserOptions): Promise<BrowserGenerationResult> {
  const manualUrls = validateManualUrls(urls ?? [])
  if (files.length === 0 && manualUrls.length === 0)
    throw new Error("Selecione ao menos um arquivo ou informe uma URL.")
  if (files.length > 100)
    throw new Error("Selecione no máximo 100 arquivos por vez.")

  const warnings: GenerationWarning[] = []
  const entries: QrEntry[] = []
  const mappings = new Map(
    spreadsheetMappings.map((mapping) => [
      `${mapping.path}\u0000${mapping.sheetName}`,
      mapping,
    ]),
  )

  if (manualUrls.length > 0) {
    const parsed = parseManualUrlEntries(manualUrls)
    entries.push(...parsed.entries)
    warnings.push(...parsed.warnings)
  }

  for (const input of files) {
    const { file, path } = input
    try {
      if (/\.txt$/i.test(file.name)) {
        const parsed = parseTextEntries(await file.text(), file.name)
        entries.push(...parsed.entries)
        warnings.push(...parsed.warnings)
      } else if (/\.xlsx$/i.test(file.name)) {
        const sheets = await readXlsxFile(file)
        for (const sheet of sheets) {
          const mapping = mappings.get(`${path}\u0000${sheet.sheet}`)
          if (mapping?.ignored) continue
          const parsed = parseWorksheetEntries(
            sheet.data,
            sheet.sheet,
            file.name,
            mapping,
          )
          entries.push(...parsed.entries)
          warnings.push(...parsed.warnings)
        }
      } else {
        warnings.push({
          sourceFile: file.name,
          message: "Formato não suportado. Use um arquivo TXT ou XLSX.",
        })
      }
    } catch (error) {
      warnings.push({
        sourceFile: file.name,
        message: `Não foi possível processar o arquivo: ${error instanceof Error ? error.message : "erro desconhecido"}.`,
      })
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "Nenhum QR code válido foi encontrado nos arquivos selecionados.",
    )
  }

  const zip = new JSZip()
  const usedNames = new Set<string>()
  const items: GeneratedQrCode[] = []

  for (const [index, entry] of entries.entries()) {
    const filename = uniqueFilename(entry.filename, usedNames)
    const previewDataUrl = await QRCode.toDataURL(entry.value, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 768,
      color: { dark: "#111827", light: "#FFFFFF" },
    })

    zip.file(filename, pngBytes(previewDataUrl))
    items.push({
      id: crypto.randomUUID(),
      filename,
      filePath: previewDataUrl,
      sourceFile: entry.sourceFile,
      encodedValue: entry.value,
      previewDataUrl,
    })

    onProgress?.({
      completed: index + 1,
      total: entries.length,
      message: `Gerando ${filename}`,
    })
  }

  const batchName = `QR-Codes_${timestamp(now)}`
  const zipFilename = `${batchName}.zip`
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })

  return {
    summary: {
      outputDirectory: batchName,
      zipPath: zipFilename,
      items,
      warnings,
    },
    zipBlob,
    zipFilename,
  }
}
