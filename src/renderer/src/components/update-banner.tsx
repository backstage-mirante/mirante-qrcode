import {
  IconCheck,
  IconCloudDownload,
  IconRefresh,
  IconRocket,
} from "@tabler/icons-react"

import { Button } from "@renderer/components/ui/button"
import { Progress } from "@renderer/components/ui/progress"
import type { UpdateState } from "@shared/contracts"

interface UpdateBannerProps {
  state: UpdateState
  onDownload: () => void
  onInstall: () => void
}

export function UpdateBanner({
  state,
  onDownload,
  onInstall,
}: UpdateBannerProps) {
  if (["idle", "not-available", "checking"].includes(state.status)) return null

  return (
    <section className="mb-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 shadow-[0_16px_60px_-40px_rgba(99,102,241,.9)]">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
          {state.status === "downloaded" ? (
            <IconRocket size={21} />
          ) : state.status === "error" ? (
            <IconRefresh size={21} />
          ) : (
            <IconCloudDownload size={21} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">
            {state.status === "available" &&
              `Atualização ${state.version} disponível`}
            {state.status === "downloading" && "Baixando atualização"}
            {state.status === "downloaded" && `Versão ${state.version} pronta`}
            {state.status === "error" && "Não foi possível atualizar"}
          </p>
          <p className="mt-0.5 truncate text-sm text-indigo-100/60">
            {state.status === "available" &&
              "Baixe agora e continue usando enquanto isso."}
            {state.status === "downloading" &&
              `${Math.round(state.percent)}% concluído`}
            {state.status === "downloaded" &&
              "Reinicie o aplicativo para concluir a instalação."}
            {state.status === "error" && state.message}
          </p>
          {state.status === "downloading" && (
            <Progress className="mt-2.5" value={state.percent} />
          )}
        </div>
        {state.status === "available" && (
          <Button size="sm" onClick={onDownload}>
            <IconCloudDownload /> Baixar
          </Button>
        )}
        {state.status === "downloaded" && (
          <Button size="sm" onClick={onInstall}>
            <IconCheck /> Reiniciar e atualizar
          </Button>
        )}
      </div>
    </section>
  )
}
