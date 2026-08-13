import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import JSZip from "jszip"
import QRCode from "qrcode"
import readXlsxFile from "read-excel-file/node"
import type { SheetData } from "read-excel-file/node"

import type {
  GeneratedQrCode,
  GenerationProgress,
  GenerationSummary,
  GenerationWarning,
} from "../shared/contracts"

interface QrEntry {
  filename: string
  value: string
  sourceFile: string
}

interface EntryParseResult {
  entries: QrEntry[]
  warnings: GenerationWarning[]
}

type SpreadsheetCell = SheetData[number][number] | Date

interface ProcessOptions {
  paths: string[]
  outputRoot: string
  onProgress?: (progress: GenerationProgress) => void
  now?: Date
}

const SUPPORTED_EXTENSIONS = new Set([".txt", ".xlsx"])
const HEADER_SCAN_LIMIT = 10

function cellString(value: SpreadsheetCell): string {
  if (value === null) return ""
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function normalizeHeader(value: SpreadsheetCell): string {
  return cellString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
}

export function sanitizeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    // oxlint-disable-next-line no-control-regex -- Windows forbids these characters in filenames.
    .replace(/[\u0000-\u001F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 120)

  return normalized || "qrcode"
}

function safeUrl(rawValue: string): URL | undefined {
  const candidate = rawValue.match(/^[a-z][a-z\d+.-]*:/i)
    ? rawValue
    : `https://${rawValue}`

  try {
    const parsed = new URL(candidate)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

function urlFilename(url: URL): string {
  const domain = url.hostname.replace(/^www\./i, "")
  const pathname = url.pathname
    .replace(/\.(html?|php|aspx?)$/i, "")
    .split("/")
    .filter(Boolean)
    .join("-")

  return sanitizeFilename(pathname ? `${domain}-${pathname}` : domain)
}

export function parseTextEntries(
  content: string,
  sourceFile: string,
): EntryParseResult {
  const entries: QrEntry[] = []
  const warnings: GenerationWarning[] = []

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const url = safeUrl(line)
    if (!url) {
      warnings.push({
        sourceFile,
        message: `Linha ${index + 1} ignorada: URL inválida.`,
      })
      continue
    }

    entries.push({
      filename: `${urlFilename(url)}.png`,
      value: url.toString(),
      sourceFile,
    })
  }

  return { entries, warnings }
}

function findColumn(
  headers: string[],
  acceptedNames: readonly string[],
): number {
  return headers.findIndex((header) => acceptedNames.includes(header))
}

export function parseWorksheetEntries(
  rows: SheetData,
  sheetName: string,
  sourceFile: string,
): EntryParseResult {
  const entries: QrEntry[] = []
  const warnings: GenerationWarning[] = []

  let headerIndex = -1
  let columns:
    { firstName: number; lastName: number; phone: number } | undefined

  for (
    let index = 0;
    index < Math.min(rows.length, HEADER_SCAN_LIMIT);
    index += 1
  ) {
    const headers = (rows[index] ?? []).map(normalizeHeader)
    const firstName = findColumn(headers, ["NOME", "PRIMEIRO NOME"])
    const lastName = findColumn(headers, ["SOBRENOME", "ULTIMO NOME"])
    const phone = findColumn(headers, ["CELULAR", "TELEFONE", "WHATSAPP"])

    if (firstName >= 0 && phone >= 0) {
      headerIndex = index
      columns = { firstName, lastName, phone }
      break
    }
  }

  if (!columns) {
    warnings.push({
      sourceFile,
      message: `Aba “${sheetName}” ignorada: colunas Nome e Celular não encontradas nas primeiras ${HEADER_SCAN_LIMIT} linhas.`,
    })
    return { entries, warnings }
  }

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? []
    const firstName = cellString(row[columns.firstName]).trim()
    const lastName =
      columns.lastName >= 0 ? cellString(row[columns.lastName]).trim() : ""
    const rawPhone = cellString(row[columns.phone]).trim()

    if (!firstName && !rawPhone) continue

    let phone = rawPhone.replace(/\D/g, "")
    if (!phone.startsWith("55")) phone = `55${phone}`

    if (!firstName || phone.length < 12 || phone.length > 13) {
      warnings.push({
        sourceFile,
        message: `Aba “${sheetName}”, linha ${index + 1} ignorada: nome ou celular inválido.`,
      })
      continue
    }

    entries.push({
      filename: `${sanitizeFilename(`${firstName} ${lastName}`)}.png`,
      value: `https://wa.me/${phone}`,
      sourceFile,
    })
  }

  return { entries, warnings }
}

function timestamp(date: Date): string {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ]

  return `${parts.slice(0, 3).join("-")}_${parts.slice(3).join("-")}`
}

function uniqueFilename(filename: string, used: Set<string>): string {
  const extension = path.extname(filename)
  const base = path.basename(filename, extension)
  let candidate = filename
  let suffix = 2

  while (used.has(candidate.toLocaleLowerCase("pt-BR"))) {
    candidate = `${base}-${suffix}${extension}`
    suffix += 1
  }

  used.add(candidate.toLocaleLowerCase("pt-BR"))
  return candidate
}

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
