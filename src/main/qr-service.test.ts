import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import {
  parseTextEntries,
  parseWorksheetEntries,
  processQrFiles,
  sanitizeFilename,
  validateInputPaths,
} from "./qr-service"

describe("sanitizeFilename", () => {
  it("remove caracteres inválidos e acentos", () => {
    expect(sanitizeFilename(' João: da Silva / "Tour" ')).toBe(
      "Joao-da-Silva-Tour",
    )
  })

  it("fornece um nome padrão", () => {
    expect(sanitizeFilename("***")).toBe("qrcode")
  })
})

describe("parseTextEntries", () => {
  it("normaliza URLs e ignora comentários", () => {
    const result = parseTextEntries(
      "# comentário\nexample.com/evento\nhttps://mirante.com.br/visita\n",
      "links.txt",
    )

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]?.value).toBe("https://example.com/evento")
    expect(result.warnings).toHaveLength(0)
  })

  it("informa linhas inválidas", () => {
    const result = parseTextEntries("https://\nfile:///segredo", "links.txt")
    expect(result.entries).toHaveLength(0)
    expect(result.warnings).toHaveLength(2)
  })
})

describe("parseWorksheetEntries", () => {
  it("encontra o cabeçalho e cria links do WhatsApp", () => {
    const rows = [
      ["Relatório"],
      ["Nome", "Sobrenome", "Celular"],
      ["Ana", "Lima", "(11) 99999-0000"],
    ]

    const result = parseWorksheetEntries(rows, "Contatos", "contatos.xlsx")
    expect(result.entries).toEqual([
      {
        filename: "Ana-Lima.png",
        value: "https://wa.me/5511999990000",
        sourceFile: "contatos.xlsx",
      },
    ])
  })
})

describe("validateInputPaths", () => {
  it("rejeita extensões desconhecidas", () => {
    expect(() => validateInputPaths(["arquivo.exe"])).toThrow(
      "Formato não suportado",
    )
  })
})

describe("processQrFiles", () => {
  it("gera imagens e um ZIP no diretório de saída", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mirante-qr-test-"))
    const input = path.join(root, "links.txt")
    await writeFile(input, "example.com\nexample.com\n")

    const result = await processQrFiles({
      paths: [input],
      outputRoot: root,
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.items.map((item) => item.filename)).toEqual([
      "example.com.png",
      "example.com-2.png",
    ])
    const zip = await JSZip.loadAsync(await readFile(result.zipPath))
    expect(Object.keys(zip.files).sort()).toEqual([
      "example.com-2.png",
      "example.com.png",
    ])
  })
})
