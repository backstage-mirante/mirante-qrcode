import { IconDownload } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@renderer/components/ui/button"

function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent>()
  const [installed, setInstalled] = useState(isInstalled)

  useEffect(() => {
    const capturePrompt = (event: BeforeInstallPromptEvent): void => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const markInstalled = (): void => {
      setInstalled(true)
      setInstallPrompt(undefined)
    }

    window.addEventListener("beforeinstallprompt", capturePrompt)
    window.addEventListener("appinstalled", markInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt)
      window.removeEventListener("appinstalled", markInstalled)
    }
  }, [])

  if (installed) return null

  async function install(): Promise<void> {
    if (!installPrompt) {
      window.alert(
        "No Microsoft Edge ou Google Chrome, abra o menu do navegador e escolha “Instalar Mirante QR”.",
      )
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === "accepted") setInstalled(true)
    setInstallPrompt(undefined)
  }

  return (
    <Button size="sm" variant="secondary" onClick={() => void install()}>
      <IconDownload /> Instalar aplicativo
    </Button>
  )
}
