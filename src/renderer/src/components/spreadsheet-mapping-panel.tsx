import {
  IconAlertTriangle,
  IconCheck,
  IconFileSpreadsheet,
} from "@tabler/icons-react"

import { Button } from "@renderer/components/ui/button"
import type {
  InputFile,
  SpreadsheetHeaderRow,
  WorksheetColumnMapping,
} from "@shared/contracts"

interface SpreadsheetMappingPanelProps {
  files: InputFile[]
  onChange: (
    filePath: string,
    sheetName: string,
    mapping: WorksheetColumnMapping,
  ) => void
}

const selectClassName =
  "mt-1.5 w-full rounded-lg border border-white/[.09] bg-[#12111a] px-3 py-2 text-xs text-zinc-200 outline-none transition focus:border-indigo-400/60"

function selectedHeader(
  headerRows: SpreadsheetHeaderRow[],
  headerRow: number,
): SpreadsheetHeaderRow | undefined {
  return headerRows.find((row) => row.index === headerRow)
}

function optionalColumn(value: string): number | undefined {
  return value === "" ? undefined : Number(value)
}

export function SpreadsheetMappingPanel({
  files,
  onChange,
}: SpreadsheetMappingPanelProps) {
  const pendingSheets = files.flatMap((file) =>
    (file.spreadsheet?.sheets ?? [])
      .filter((sheet) => sheet.manualMappingRequired)
      .map((sheet) => ({ file, sheet })),
  )
  const analysisErrors = files.flatMap((file) =>
    file.spreadsheet?.error
      ? [{ file, message: file.spreadsheet.error }]
      : [],
  )

  if (pendingSheets.length === 0 && analysisErrors.length === 0) return null

  return (
    <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.055] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
          <IconFileSpreadsheet size={19} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Confirme as colunas da planilha
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            A detecção automática não encontrou Nome ou Celular em algumas
            abas. Escolha as colunas corretas antes de gerar os QR codes.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {analysisErrors.map(({ file, message }) => (
          <div
            key={file.path}
            className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[.07] p-3 text-xs text-rose-200"
          >
            <IconAlertTriangle className="mt-0.5 shrink-0" size={16} />
            <p>
              <strong>{file.name}:</strong> {message}
            </p>
          </div>
        ))}

        {pendingSheets.map(({ file, sheet }) => {
          const header = selectedHeader(
            sheet.headerRows,
            sheet.mapping.headerRow,
          )
          const complete =
            sheet.mapping.ignored ||
            (sheet.mapping.nameColumn !== undefined &&
              sheet.mapping.phoneColumn !== undefined &&
              sheet.mapping.nameColumn !== sheet.mapping.phoneColumn)

          return (
            <div
              key={`${file.path}:${sheet.sheetName}`}
              className="rounded-xl border border-white/[.08] bg-black/15 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-200">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Aba: {sheet.sheetName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {complete && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-300">
                      <IconCheck size={13} />
                      {sheet.mapping.ignored ? "Ignorada" : "Pronta"}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChange(file.path, sheet.sheetName, {
                        ...sheet.mapping,
                        ignored: !sheet.mapping.ignored,
                      })
                    }
                  >
                    {sheet.mapping.ignored ? "Usar aba" : "Ignorar aba"}
                  </Button>
                </div>
              </div>

              {!sheet.mapping.ignored && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-medium text-zinc-400">
                    Linha do cabeçalho
                    <select
                      className={selectClassName}
                      value={sheet.mapping.headerRow}
                      onChange={(event) => {
                        const nextHeader = selectedHeader(
                          sheet.headerRows,
                          Number(event.currentTarget.value),
                        )
                        if (!nextHeader) return
                        onChange(file.path, sheet.sheetName, {
                          headerRow: nextHeader.index,
                          nameColumn: nextHeader.detectedNameColumn,
                          lastNameColumn: nextHeader.detectedLastNameColumn,
                          phoneColumn: nextHeader.detectedPhoneColumn,
                        })
                      }}
                    >
                      {sheet.headerRows.map((row) => (
                        <option key={row.index} value={row.index}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-medium text-zinc-400">
                    Coluna do nome
                    <select
                      className={selectClassName}
                      value={sheet.mapping.nameColumn ?? ""}
                      onChange={(event) =>
                        onChange(file.path, sheet.sheetName, {
                          ...sheet.mapping,
                          nameColumn: optionalColumn(event.currentTarget.value),
                        })
                      }
                    >
                      <option value="">Selecione…</option>
                      {header?.columns.map((column) => (
                        <option key={column.index} value={column.index}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-medium text-zinc-400">
                    Coluna do celular
                    <select
                      className={selectClassName}
                      value={sheet.mapping.phoneColumn ?? ""}
                      onChange={(event) =>
                        onChange(file.path, sheet.sheetName, {
                          ...sheet.mapping,
                          phoneColumn: optionalColumn(
                            event.currentTarget.value,
                          ),
                        })
                      }
                    >
                      <option value="">Selecione…</option>
                      {header?.columns.map((column) => (
                        <option key={column.index} value={column.index}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {!sheet.mapping.ignored &&
                sheet.mapping.nameColumn !== undefined &&
                sheet.mapping.nameColumn === sheet.mapping.phoneColumn && (
                  <p className="mt-2 text-[11px] text-amber-200">
                    Nome e Celular devem usar colunas diferentes.
                  </p>
                )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
