import type { SheetData } from "read-excel-file/browser"

import type { GenerationWarning } from "./contracts"

export interface QrEntry {
  filename: string
  value: string
  sourceFile: string
}

export interface EntryParseResult {
  entries: QrEntry[]
  warnings: GenerationWarning[]
}

type SpreadsheetCell = SheetData[number][number] | Date

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

export function timestamp(date: Date): string {
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

export function uniqueFilename(filename: string, used: Set<string>): string {
  const dotIndex = filename.lastIndexOf(".")
  const hasExtension = dotIndex > 0
  const extension = hasExtension ? filename.slice(dotIndex) : ""
  const base = hasExtension ? filename.slice(0, dotIndex) : filename
  let candidate = filename
  let suffix = 2

  while (used.has(candidate.toLocaleLowerCase("pt-BR"))) {
    candidate = `${base}-${suffix}${extension}`
    suffix += 1
  }

  used.add(candidate.toLocaleLowerCase("pt-BR"))
  return candidate
}
