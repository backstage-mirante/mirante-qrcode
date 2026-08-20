import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import { processQrFilesInBrowser } from "./web-qr-service"

describe("processQrFilesInBrowser", () => {
  it("gera QR codes e entrega um ZIP sem enviar o arquivo", async () => {
    const input = new File(["example.com\nexample.com\n"], "links.txt", {
      type: "text/plain",
    })

    const result = await processQrFilesInBrowser({
      files: [{ path: "web:links.txt", file: input }],
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

  it("gera QR codes a partir de URLs digitadas sem arquivo selecionado", async () => {
    const result = await processQrFilesInBrowser({
      files: [],
      urls: ["example.com/evento", "example.com/evento"],
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.summary.items.map((item) => item.filename)).toEqual([
      "example.com-evento.png",
      "example.com-evento-2.png",
    ])
    expect(result.summary.items[0]?.sourceFile).toBe("URLs digitadas")

    const zip = await JSZip.loadAsync(await result.zipBlob.arrayBuffer())
    expect(new Set(Object.keys(zip.files))).toEqual(
      new Set(["example.com-evento.png", "example.com-evento-2.png"]),
    )
  })

  it("gera QR codes a partir de contatos digitados sem arquivo selecionado", async () => {
    const result = await processQrFilesInBrowser({
      files: [],
      contacts: [{ name: "João da Silva", phone: "(11) 97355-8890" }],
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(
      result.summary.items.map((item) => ({
        filename: item.filename,
        encodedValue: item.encodedValue,
      })),
    ).toEqual([
      {
        filename: "Joao-da-Silva.png",
        encodedValue: "https://wa.me/5511973558890",
      },
    ])

    const zip = await JSZip.loadAsync(await result.zipBlob.arrayBuffer())
    expect(Object.keys(zip.files)).toEqual(["Joao-da-Silva.png"])
  })

  it("emite as URLs digitadas antes das entradas dos arquivos", async () => {
    const input = new File(["mirante.com.br/visita\n"], "links.txt", {
      type: "text/plain",
    })

    const result = await processQrFilesInBrowser({
      files: [{ path: "web:links.txt", file: input }],
      urls: ["example.com/evento"],
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.summary.items[0]?.filename).toBe("example.com-evento.png")
  })

  it("recusa a geração sem arquivo, URL ou contato digitado", async () => {
    await expect(
      processQrFilesInBrowser({ files: [], urls: [], contacts: [] }),
    ).rejects.toThrow(
      "Selecione ao menos um arquivo, informe uma URL ou digite um contato.",
    )
  })
})
