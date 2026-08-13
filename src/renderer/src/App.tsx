import {
  IconAlertTriangle,
  IconArrowRight,
  IconBrandGithub,
  IconCheck,
  IconFileSpreadsheet,
  IconFileText,
  IconFolder,
  IconQrcode,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { useEffect, useMemo, useState } from "react"

import { DropZone } from "@renderer/components/drop-zone"
import { ResultsGallery } from "@renderer/components/results-gallery"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import { Progress } from "@renderer/components/ui/progress"
import { UpdateBanner } from "@renderer/components/update-banner"
import { formatBytes } from "@renderer/lib/utils"
import type {
  AppInfo,
  GenerationProgress,
  GenerationSummary,
  InputFile,
  UpdateState,
} from "@shared/contracts"

function mergeFiles(current: InputFile[], incoming: InputFile[]): InputFile[] {
  const byPath = new Map(current.map((file) => [file.path.toLowerCase(), file]))
  for (const file of incoming) byPath.set(file.path.toLowerCase(), file)
  return Array.from(byPath.values()).slice(0, 100)
}

export default function App() {
  const [appInfo, setAppInfo] = useState<AppInfo>()
  const [files, setFiles] = useState<InputFile[]>([])
  const [outputDirectory, setOutputDirectory] = useState("")
  const [summary, setSummary] = useState<GenerationSummary>()
  const [progress, setProgress] = useState<GenerationProgress>()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>()
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: "idle",
  })

  useEffect(() => {
    void window.qrApp.getAppInfo().then((info) => {
      setAppInfo(info)
      setOutputDirectory(info.defaultOutputDirectory)
    })
    const stopProgress = window.qrApp.onGenerationProgress(setProgress)
    const stopUpdates = window.qrApp.onUpdateState(setUpdateState)
    return () => {
      stopProgress()
      stopUpdates()
    }
  }, [])

  const totalSize = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files],
  )
  const progressPercent = progress
    ? (progress.completed / Math.max(progress.total, 1)) * 100
    : 0

  async function browse(): Promise<void> {
    try {
      setError(undefined)
      const selected = await window.qrApp.selectFiles()
      setFiles((current) => mergeFiles(current, selected))
    } catch (browseError) {
      setError(
        browseError instanceof Error
          ? browseError.message
          : "Ocorreu um erro inesperado.",
      )
    }
  }

  async function addDroppedFiles(dropped: File[]): Promise<void> {
    try {
      setError(undefined)
      const supported = dropped.filter((file) =>
        /\.(txt|xlsx)$/i.test(file.name),
      )
      if (supported.length === 0) {
        setError("Solte arquivos TXT ou XLSX.")
        return
      }
      const described = await window.qrApp.describeDroppedFiles(supported)
      setFiles((current) => mergeFiles(current, described))
    } catch (dropError) {
      setError(
        dropError instanceof Error
          ? dropError.message
          : "Ocorreu um erro inesperado.",
      )
    }
  }

  async function chooseOutput(): Promise<void> {
    const selected = await window.qrApp.selectOutputDirectory()
    if (selected) setOutputDirectory(selected)
  }

  async function generate(): Promise<void> {
    if (files.length === 0) return
    setGenerating(true)
    setError(undefined)
    setSummary(undefined)
    setProgress({ completed: 0, total: 1, message: "Preparando arquivos…" })
    try {
      setSummary(
        await window.qrApp.generate({
          paths: files.map((file) => file.path),
          outputRoot: outputDirectory,
        }),
      )
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Ocorreu um erro inesperado.",
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0a12] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-52 size-[520px] rounded-full bg-indigo-600/[.08] blur-3xl" />
        <div className="absolute -right-52 top-1/3 size-[460px] rounded-full bg-violet-600/[.06] blur-3xl" />
      </div>

      <header className="relative border-b border-white/[.07] bg-[#0b0a12]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-[0_8px_30px_-10px_rgba(99,102,241,.9)]">
              <IconQrcode size={21} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">
                Mirante QR
              </p>
              <p className="text-[10px] uppercase tracking-[.16em] text-zinc-500">
                Backstage Mirante
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="neutral">v{appInfo?.version ?? "—"}</Badge>
            <Button
              aria-label="Verificar atualizações"
              size="icon"
              variant="ghost"
              onClick={() => void window.qrApp.checkForUpdates()}
            >
              <IconRefresh />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <UpdateBanner
          state={updateState}
          onDownload={() => void window.qrApp.downloadUpdate()}
          onInstall={() => void window.qrApp.installUpdate()}
        />

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge>Gerador em lote</Badge>
            <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-[-.035em] text-white sm:text-4xl">
              QR codes prontos para compartilhar em poucos cliques.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Importe contatos de uma planilha ou uma lista de links. O
              aplicativo valida, organiza e entrega as imagens junto com um
              arquivo ZIP.
            </p>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-xl font-semibold text-white">{files.length}</p>
              <p className="text-xs text-zinc-500">arquivos</p>
            </div>
            <div className="h-9 w-px bg-white/[.08]" />
            <div>
              <p className="text-xl font-semibold text-white">
                {formatBytes(totalSize)}
              </p>
              <p className="text-xs text-zinc-500">selecionados</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <DropZone
              disabled={generating}
              onBrowse={() => void browse()}
              onDropFiles={(dropped) => void addDroppedFiles(dropped)}
            />

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.08] p-4 text-sm text-rose-200">
                <IconAlertTriangle className="mt-0.5 shrink-0" size={18} />
                <p className="flex-1">{error}</p>
                <button
                  aria-label="Fechar erro"
                  onClick={() => setError(undefined)}
                >
                  <IconX size={17} />
                </button>
              </div>
            )}

            {summary && <ResultsGallery summary={summary} />}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Arquivos selecionados
                </h2>
                {files.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setFiles([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>

              {files.length === 0 ? (
                <p className="rounded-xl border border-white/[.06] bg-black/10 px-4 py-7 text-center text-xs leading-5 text-zinc-500">
                  Os arquivos adicionados aparecerão aqui.
                </p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {files.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-black/10 p-3"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-indigo-300">
                        {file.kind === "txt" ? (
                          <IconFileText size={17} />
                        ) : (
                          <IconFileSpreadsheet size={17} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-200">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                      <button
                        aria-label={`Remover ${file.name}`}
                        className="text-zinc-600 transition hover:text-rose-300"
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((item) => item.path !== file.path),
                          )
                        }
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <IconFolder className="text-indigo-300" size={18} /> Pasta de
                destino
              </div>
              <p className="mt-3 break-all rounded-xl border border-white/[.06] bg-black/10 p-3 text-xs leading-5 text-zinc-400">
                {outputDirectory || "Carregando…"}
              </p>
              <Button
                className="mt-3 w-full"
                disabled={generating}
                variant="secondary"
                onClick={() => void chooseOutput()}
              >
                Alterar pasta
              </Button>
            </section>

            {generating ? (
              <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[.07] p-4">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-100">
                    Gerando QR codes
                  </span>
                  <span className="text-indigo-200/60">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <Progress value={progressPercent} />
                <p className="mt-2 truncate text-[11px] text-zinc-500">
                  {progress?.message}
                </p>
              </section>
            ) : (
              <Button
                className="w-full"
                disabled={files.length === 0 || !outputDirectory}
                size="lg"
                onClick={() => void generate()}
              >
                <IconQrcode /> Gerar QR codes <IconArrowRight />
              </Button>
            )}

            <div className="rounded-xl border border-white/[.06] px-4 py-3 text-[11px] leading-5 text-zinc-500">
              <p className="flex gap-2">
                <IconCheck
                  className="mt-0.5 shrink-0 text-emerald-400"
                  size={14}
                />
                Planilhas precisam das colunas Nome e Celular. Sobrenome é
                opcional.
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-white/[.06] pt-5 text-[11px] text-zinc-600">
          <span>
            Processamento local · seus arquivos não são enviados para a internet
          </span>
          <a
            className="flex items-center gap-1.5 transition hover:text-zinc-300"
            href="https://github.com/backstage-mirante/scripts-gerar-qrcode"
            rel="noreferrer"
            target="_blank"
          >
            <IconBrandGithub size={14} /> Código-fonte
          </a>
        </footer>
      </main>
    </div>
  )
}
