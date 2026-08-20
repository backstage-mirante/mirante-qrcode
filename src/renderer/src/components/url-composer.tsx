import { IconLink, IconSend } from "@tabler/icons-react"
import type { KeyboardEvent } from "react"

import { PasteButton } from "@renderer/components/paste-button"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import { Textarea } from "@renderer/components/ui/textarea"
import type { QrEntry } from "@shared/qr-core"

const urlPlaceholder = "https://mirante.com.br/visita\nexample.com/evento"

interface UrlComposerProps {
  value: string
  entries: QrEntry[]
  invalidCount: number
  disabled?: boolean
  canGenerate: boolean
  onChange: (value: string) => void
  onGenerate: () => void
}

export function UrlComposer({
  value,
  entries,
  invalidCount,
  disabled,
  canGenerate,
  onChange,
  onGenerate,
}: UrlComposerProps) {
  function submitOnShortcut(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return
    if (!canGenerate || disabled) return
    event.preventDefault()
    onGenerate()
  }

  function appendPastedUrls(text: string): void {
    const pasted = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .join("\n")
    if (pasted === "") return
    const current = value.replace(/\s+$/, "")
    onChange(current === "" ? pasted : `${current}\n${pasted}`)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
            <IconLink size={17} />
          </div>
          <h2 className="text-sm font-semibold text-white">Digitar URLs</h2>
        </div>
        <div className="flex items-center gap-2">
          <PasteButton
            disabled={disabled}
            label="Colar URLs"
            onPaste={appendPastedUrls}
          />
          {value !== "" && (
            <Button size="sm" variant="ghost" onClick={() => onChange("")}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Uma URL por linha. O nome do arquivo vem da URL normalizada.
      </p>

      <Textarea
        aria-label="Lista de URLs"
        disabled={disabled}
        placeholder={urlPlaceholder}
        rows={4}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={submitOnShortcut}
      />

      {entries.length > 0 && (
        <ul className="mt-3 max-h-32 space-y-1.5 overflow-y-auto rounded-xl border border-white/[.06] bg-black/10 p-3 text-[11px] text-zinc-400">
          {entries.map((entry, index) => (
            <li key={`${index}-${entry.value}`} className="flex items-center gap-3">
              <span className="min-w-0 truncate font-medium">
                {entry.filename}
              </span>
              <span className="ml-auto min-w-0 max-w-[45%] truncate text-zinc-600">
                {entry.value}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <Badge variant="success">
              {entries.length === 1
                ? "1 URL válida"
                : `${entries.length} URLs válidas`}
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="warning">
              {invalidCount === 1
                ? "1 linha ignorada"
                : `${invalidCount} linhas ignoradas`}
            </Badge>
          )}
          {value === "" && (
            <span className="text-[11px] text-zinc-500">
              Ctrl + Enter para gerar
            </span>
          )}
        </div>
        <Button disabled={!canGenerate || disabled} onClick={onGenerate}>
          <IconSend /> GERAR
        </Button>
      </div>
    </div>
  )
}
