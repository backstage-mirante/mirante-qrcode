import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

describe("Content Security Policy", () => {
  it("permite os workers locais usados na leitura de XLSX", async () => {
    const html = await readFile(resolve("src/renderer/index.html"), "utf8")

    expect(html).toContain("worker-src 'self' blob:")
  })

  it("permite os recursos oficiais da toolbar da Vercel", async () => {
    const html = await readFile(resolve("src/renderer/index.html"), "utf8")

    expect(html).toContain("script-src 'self' https://vercel.live")
    expect(html).toContain(
      "connect-src 'self' https://vercel.live wss://ws-us3.pusher.com",
    )
    expect(html).toContain("frame-src https://vercel.live")
  })
})
