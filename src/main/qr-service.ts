import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import JSZip from "jszip"
import QRCode from "qrcode"
import readXlsxFile from "read-excel-file/node"

import type {
  GeneratedQrCode,
  GenerationProgress,
  GenerationSummary,
  GenerationWarning,
} from "../shared/contracts"
import {
  parseTextEntries,
  parseWorksheetEntries,
  sanitizeFilename,
  timestamp,
  uniqueFilename,
} from "../shared/qr-core"
import type { QrEntry } from "../shared/qr-core"

export { parseTextEntries, parseWorksheetEntries, sanitizeFilename }

interface ProcessOptions {
  paths: string[]
  outputRoot: string
  onProgress?: (progress: GenerationProgress) => void
  now?: Date
}

const SUPPORTED_EXTENSIONS = new Set([".txt", ".xlsx"])

export function validateInputPaths(paths: string[]): string[] {
  if (paths.length === 0) throw new Error("Selecione ao menos um arquivo.")
  if (paths.length > 100)
    throw new Error("Selecione no máximo 100 arquivos por vez.")

  return paths.map((filePath) => {
    const resolved = path.resolve(filePath)
    if (!SUPPORTED_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
      throw new Error(`Formato não suportado: ${path.basename(resolved)}`)
    }
    return resolved
  })
}

export async function processQrFiles({
  paths,
  outputRoot,
  onProgress,
  now = new Date(),
}: ProcessOptions): Promise<GenerationSummary> {
  const safePaths = validateInputPaths(paths)
  const outputDirectory = path.join(
    path.resolve(outputRoot),
    `QR-Codes_${timestamp(now)}`,
  )
  await mkdir(outputDirectory, { recursive: true })

  const warnings: GenerationWarning[] = []
  const entries: QrEntry[] = []

  for (const filePath of safePaths) {
    const sourceFile = path.basename(filePath)
    const extension = path.extname(filePath).toLowerCase()

    try {
      if (extension === ".txt") {
        const parsed = parseTextEntries(
          await readFile(filePath, "utf8"),
          sourceFile,
        )
        entries.push(...parsed.entries)
        warnings.push(...parsed.warnings)
      } else {
        const sheets = await readXlsxFile(filePath)
        for (const sheet of sheets) {
          const parsed = parseWorksheetEntries(
            sheet.data,
            sheet.sheet,
            sourceFile,
          )
          entries.push(...parsed.entries)
          warnings.push(...parsed.warnings)
        }
      }
    } catch (error) {
      warnings.push({
        sourceFile,
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
    const filePath = path.join(outputDirectory, filename)
    const buffer = await QRCode.toBuffer(entry.value, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 4,
      width: 768,
      color: { dark: "#111827", light: "#FFFFFF" },
    })

    await writeFile(filePath, buffer)
    zip.file(filename, buffer)
    items.push({
      id:
        createHash("sha256")
          .update(`${entry.sourceFile}:${entry.value}:${index}`)
          .digest("hex")
          .slice(0, 16) || randomUUID(),
      filename,
      filePath,
      sourceFile: entry.sourceFile,
      encodedValue: entry.value,
      previewDataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    })

    onProgress?.({
      completed: index + 1,
      total: entries.length,
      message: `Gerando ${filename}`,
    })
  }

  const zipPath = path.join(outputDirectory, "QR-Codes.zip")
  await writeFile(
    zipPath,
    await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  )

  return { outputDirectory, zipPath, items, warnings }
}
