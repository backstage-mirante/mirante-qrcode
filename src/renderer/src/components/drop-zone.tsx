import {
  IconFileSpreadsheet,
  IconFileText,
  IconUpload,
} from "@tabler/icons-react"
import { useRef, useState } from "react"

import { Button } from "@renderer/components/ui/button"
import { cn } from "@renderer/lib/utils"

interface DropZoneProps {
  disabled?: boolean
  onBrowse: () => void
  onDropFiles: (files: File[]) => void
}

export function DropZone({ disabled, onBrowse, onDropFiles }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-all",
        dragging
          ? "border-indigo-400 bg-indigo-500/10 shadow-[inset_0_0_60px_rgba(99,102,241,.08)]"
          : "border-white/15 bg-white/[.025] hover:border-white/25 hover:bg-white/[.04]",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        dragCounter.current += 1
        setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragCounter.current -= 1
        if (dragCounter.current === 0) setDragging(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        dragCounter.current = 0
        setDragging(false)
        onDropFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 [background:radial-gradient(circle_at_50%_0%,rgba(129,140,248,.1),transparent_55%)]" />
      <div className="relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
        <IconUpload size={26} stroke={1.8} />
      </div>
      <h2 className="relative text-base font-semibold text-white">
        Arraste suas planilhas ou listas aqui
      </h2>
      <p className="relative mt-1.5 text-sm text-zinc-400">
        Arquivos XLSX ou TXT · até 100 arquivos por lote
      </p>
      <Button className="relative mt-5" variant="secondary" onClick={onBrowse}>
        Selecionar arquivos
      </Button>
      <div className="relative mt-5 flex justify-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <IconFileSpreadsheet size={15} /> Contatos de WhatsApp
        </span>
        <span className="flex items-center gap-1.5">
          <IconFileText size={15} /> Lista de URLs
        </span>
      </div>
    </div>
  )
}
