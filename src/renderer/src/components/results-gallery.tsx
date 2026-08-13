import { IconFolderOpen, IconPackage, IconPhoto } from "@tabler/icons-react"

import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import type { GenerationSummary } from "@shared/contracts"

interface ResultsGalleryProps {
  summary: GenerationSummary
}

export function ResultsGallery({ summary }: ResultsGalleryProps) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/15 bg-emerald-400/[.035]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[.07] p-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
          <IconPackage size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white">Lote concluído</h2>
          <p className="truncate text-sm text-zinc-400">
            {summary.outputDirectory}
          </p>
        </div>
        <Badge variant="success">{summary.items.length} QR codes</Badge>
        {summary.warnings.length > 0 && (
          <Badge variant="warning">{summary.warnings.length} avisos</Badge>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            void window.qrApp.openOutputDirectory(summary.outputDirectory)
          }
        >
          <IconFolderOpen /> Abrir pasta
        </Button>
      </div>

      <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 lg:grid-cols-4">
        {summary.items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="group overflow-hidden rounded-xl border border-white/[.07] bg-[#111019] text-left transition hover:border-indigo-400/30 hover:bg-[#161421] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            onClick={() => void window.qrApp.revealFile(item.filePath)}
          >
            <div className="aspect-square bg-white p-3">
              <img
                alt={`QR code ${item.filename}`}
                className="h-full w-full object-contain"
                src={item.previewDataUrl}
              />
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-semibold text-zinc-200">
                {item.filename}
              </p>
              <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-zinc-500">
                <IconPhoto size={12} /> {item.sourceFile}
              </p>
            </div>
          </button>
        ))}
      </div>

      {summary.warnings.length > 0 && (
        <details className="border-t border-white/[.07] px-5 py-4 text-sm">
          <summary className="cursor-pointer font-medium text-amber-200">
            Ver avisos do processamento
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
            {summary.warnings.map((warning, index) => (
              <li key={`${warning.sourceFile}-${index}`}>
                <strong className="text-zinc-300">{warning.sourceFile}:</strong>{" "}
                {warning.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
