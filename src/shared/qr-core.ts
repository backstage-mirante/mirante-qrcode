import type { SheetData } from "read-excel-file/browser"

import type { GenerationWarning } from "./contracts"
import type {
  SpreadsheetHeaderRow,
  WorksheetColumnMapping,
} from "./contracts"

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

export const MANUAL_URL_SOURCE = "URLs digitadas"
export const MAX_MANUAL_URLS = 500

/** QR version 40 at error level M holds about 2331 bytes, so longer lines cannot be encoded. */
const MAX_URL_LENGTH = 2048

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

    if (line.length > MAX_URL_LENGTH) {
      warnings.push({
        sourceFile,
        message: `Linha ${index + 1} ignorada: URL muito longa (máximo ${MAX_URL_LENGTH} caracteres).`,
      })
      continue
    }

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

/**
 * Split typed text into candidate URL lines, one per row of the original text.
 * Blank rows and `#` comments become empty strings so every remaining line keeps
 * its row number, which is what the generation warnings report back to the user.
 */
export function splitUrlLines(text: string): string[] {
  return text.split(/\r?\n/).map((rawLine) => {
    const line = rawLine.trim()
    return line.startsWith("#") ? "" : line
  })
}

/** Typed URLs reuse the TXT parser so filenames stay identical to a .txt with the same lines. */
export function parseManualUrlEntries(lines: string[]): EntryParseResult {
  return parseTextEntries(lines.join("\n"), MANUAL_URL_SOURCE)
}

/**
 * Guards untrusted renderer input: checks array shape and the count cap.
 * Returns the rows with their positions intact, or an empty list when the user
 * typed nothing usable.
 */
export function validateManualUrls(urls: string[]): string[] {
  if (!Array.isArray(urls)) throw new Error("Lista de URLs inválida.")

  const lines = splitUrlLines(urls.join("\n"))
  const candidates = lines.filter((line) => line.length > 0)
  if (candidates.length > MAX_MANUAL_URLS) {
    throw new Error(`Informe no máximo ${MAX_MANUAL_URLS} URLs por vez.`)
  }

  return candidates.length > 0 ? lines : []
}

function findColumn(
  headers: string[],
  acceptedNames: readonly string[],
): number {
  return headers.findIndex((header) => acceptedNames.includes(header))
}

function columnLetter(index: number): string {
  let value = index + 1
  let result = ""

  while (value > 0) {
    value -= 1
    result = String.fromCharCode(65 + (value % 26)) + result
    value = Math.floor(value / 26)
  }

  return result
}

function headerColumns(
  row: SheetData[number] | undefined,
  width: number,
) {
  return Array.from({ length: width }, (_, index) => {
    const value = cellString(row?.[index] ?? null).trim()
    return {
      index,
      label: `${columnLetter(index)} — ${value || "Sem título"}`,
    }
  })
}

export interface WorksheetColumnInspection {
  headerRows: SpreadsheetHeaderRow[]
  suggestedHeaderRow: number
  hasTabularData: boolean
}

export function inspectWorksheetColumns(
  rows: SheetData,
): WorksheetColumnInspection {
  const scannedRows = rows.slice(0, HEADER_SCAN_LIMIT)
  const width = scannedRows.reduce(
    (largest, row) => Math.max(largest, row.length),
    0,
  )

  const headerRows = scannedRows
    .map((row, index): SpreadsheetHeaderRow | undefined => {
      const normalized = row.map(normalizeHeader)
      const nonEmpty = normalized.filter(Boolean)
      if (nonEmpty.length === 0) return undefined

      const detectedNameColumn = findColumn(normalized, [
        "NOME",
        "PRIMEIRO NOME",
      ])
      const detectedLastNameColumn = findColumn(normalized, [
        "SOBRENOME",
        "ULTIMO NOME",
      ])
      const detectedPhoneColumn = findColumn(normalized, [
        "CELULAR",
        "TELEFONE",
        "WHATSAPP",
      ])
      const preview = row
        .map((value) => cellString(value).trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ")

      return {
        index,
        label: `Linha ${index + 1}${preview ? ` — ${preview}` : ""}`,
        columns: headerColumns(row, width),
        detectedNameColumn:
          detectedNameColumn >= 0 ? detectedNameColumn : undefined,
        detectedLastNameColumn:
          detectedLastNameColumn >= 0 ? detectedLastNameColumn : undefined,
        detectedPhoneColumn:
          detectedPhoneColumn >= 0 ? detectedPhoneColumn : undefined,
      }
    })
    .filter((row): row is SpreadsheetHeaderRow => Boolean(row))

  const suggested = headerRows.reduce<SpreadsheetHeaderRow | undefined>(
    (best, candidate) => {
      const score =
        (candidate.detectedNameColumn === undefined ? 0 : 100) +
        (candidate.detectedPhoneColumn === undefined ? 0 : 100) +
        (candidate.detectedLastNameColumn === undefined ? 0 : 10) +
        candidate.columns.filter((column) => !column.label.endsWith("Sem título"))
          .length
      const bestScore = best
        ? (best.detectedNameColumn === undefined ? 0 : 100) +
          (best.detectedPhoneColumn === undefined ? 0 : 100) +
          (best.detectedLastNameColumn === undefined ? 0 : 10) +
          best.columns.filter(
            (column) => !column.label.endsWith("Sem título"),
          ).length
        : -1
      return score > bestScore ? candidate : best
    },
    undefined,
  )

  return {
    headerRows,
    suggestedHeaderRow: suggested?.index ?? 0,
    hasTabularData: width >= 2 && headerRows.length > 0,
  }
}

export function parseWorksheetEntries(
  rows: SheetData,
  sheetName: string,
  sourceFile: string,
  mapping?: WorksheetColumnMapping,
): EntryParseResult {
  const entries: QrEntry[] = []
  const warnings: GenerationWarning[] = []

  let headerIndex = -1
  let columns:
    { firstName: number; lastName: number; phone: number } | undefined

  if (
    mapping &&
    mapping.nameColumn !== undefined &&
    mapping.phoneColumn !== undefined
  ) {
    headerIndex = mapping.headerRow
    columns = {
      firstName: mapping.nameColumn,
      lastName: mapping.lastNameColumn ?? -1,
      phone: mapping.phoneColumn,
    }
  } else {
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
