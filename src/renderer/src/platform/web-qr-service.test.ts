import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import { processQrFilesInBrowser } from "./web-qr-service"

describe("processQrFilesInBrowser", () => {
  it("gera QR codes e entrega um ZIP sem enviar o arquivo", async () => {
    const input = new File(["example.com\nexample.com\n"], "links.txt", {
      type: "text/plain",
    })

    const result = await processQrFilesInBrowser({
      files: [input],
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.zipFilename).toBe("QR-Codes_2026-08-13_12-30-00.zip")
    expect(result.summary.items.map((item) => item.filename)).toEqual([
      "example.com.png",
      "example.com-2.png",
    ])

    const zip = await JSZip.loadAsync(await result.zipBlob.arrayBuffer())
    expect(new Set(Object.keys(zip.files))).toEqual(
      new Set(["example.com-2.png", "example.com.png"]),
    )
  })
})
