import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./styles/globals.css"

async function start(): Promise<void> {
  const root = document.getElementById("root")
  if (!root) throw new Error("Elemento raiz não encontrado.")

  if (!window.qrApp) {
    const { webQrApp } = await import("./platform/web-api")
    window.qrApp = webQrApp
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
