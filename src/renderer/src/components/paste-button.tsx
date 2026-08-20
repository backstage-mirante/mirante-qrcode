import { IconClipboard } from "@tabler/icons-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@renderer/components/ui/button"

const clipboardError = "Não foi possível ler a área de transferência."
const errorTimeoutMs = 4_000

interface PasteButtonProps {
  label?: string
  disabled?: boolean
  onPaste: (text: string) => void
}

export function PasteButton({
  label = "Colar",
  disabled,
  onPaste,
}: PasteButtonProps) {
  const [failed, setFailed] = useState(false)
  const mounted = useRef(true)
  const timer = useRef<number>(undefined)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(timer.current)
    }
  }, [])

  async function paste(): Promise<void> {
    try {
      const text = (await window.qrApp.readClipboardText()).trim()
      if (!mounted.current) return
      setFailed(false)
      if (text !== "") onPaste(text)
    } catch {
      if (!mounted.current) return
      setFailed(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (mounted.current) setFailed(false)
      }, errorTimeoutMs)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {failed && (
        <span className="text-[11px] leading-4 text-rose-300" role="status">
          {clipboardError}
        </span>
      )}
      <Button
        disabled={disabled}
        size="sm"
        variant="secondary"
        onClick={() => void paste()}
      >
        <IconClipboard /> {label}
      </Button>
    </span>
  )
}
