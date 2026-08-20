import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import {
  inspectWorksheetColumns,
  parseManualUrlEntries,
  parseWorksheetEntries,
  validateManualUrls,
} from "../shared/qr-core"
import {
  parseTextEntries,
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

  it("ignora uma URL maior que o limite do QR code", () => {
    const result = parseTextEntries(
      `example.com\nhttps://example.com/${"a".repeat(3000)}`,
      "links.txt",
    )

    expect(result.entries).toHaveLength(1)
    expect(result.warnings[0]?.message).toBe(
      "Linha 2 ignorada: URL muito longa (máximo 2048 caracteres).",
    )
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

  it("sugere a linha de cabeçalho mesmo com títulos desconhecidos", () => {
    const rows = [
      ["Relatório"],
      ["Pessoa responsável", "Número principal"],
      ["Ana Lima", "(11) 99999-0000"],
    ]

    const inspection = inspectWorksheetColumns(rows)
    expect(inspection.suggestedHeaderRow).toBe(1)
    expect(inspection.headerRows[1]?.columns.map((column) => column.label)).toEqual(
      ["A — Pessoa responsável", "B — Número principal"],
    )
  })

  it("usa o mapeamento manual quando o cabeçalho não é reconhecido", () => {
    const rows = [
      ["Relatório"],
      ["Pessoa responsável", "Número principal"],
      ["Ana Lima", "(11) 99999-0000"],
    ]

    const result = parseWorksheetEntries(
      rows,
      "Contatos",
      "contatos.xlsx",
      { headerRow: 1, nameColumn: 0, phoneColumn: 1 },
    )

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

  it("aceita uma lista vazia de arquivos", () => {
    expect(validateInputPaths([])).toEqual([])
  })
})

describe("validateManualUrls", () => {
  it("normaliza as linhas e mantém a posição de cada URL", () => {
    expect(
      validateManualUrls([
        "  example.com  ",
        "",
        "   ",
        "# comentário",
        "mirante.com.br",
      ]),
    ).toEqual(["example.com", "", "", "", "mirante.com.br"])
  })

  it("descarta uma lista sem nenhuma URL", () => {
    expect(validateManualUrls(["", "   ", "# só comentário"])).toEqual([])
  })

  it("rejeita mais de 500 URLs", () => {
    const urls = Array.from({ length: 501 }, () => "example.com")
    expect(() => validateManualUrls(urls)).toThrow(
      "Informe no máximo 500 URLs por vez.",
    )
  })

  it("não conta linhas vazias no limite de URLs", () => {
    const urls = Array.from({ length: 501 }, (_, index) =>
      index % 2 === 0 ? "example.com" : "",
    )
    expect(validateManualUrls(urls)).toHaveLength(501)
  })
})

describe("parseManualUrlEntries", () => {
  it("cria entradas com a origem digitada e informa linhas inválidas", () => {
    const result = parseManualUrlEntries(["example.com/evento", "não é url"])
    const fromText = parseTextEntries("example.com/evento", "links.txt")

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.sourceFile).toBe("URLs digitadas")
    expect(result.entries[0]?.filename).toBe(fromText.entries[0]?.filename)
    expect(result.warnings).toHaveLength(1)
  })

  it("numera o aviso pela linha digitada pelo usuário", () => {
    const result = parseManualUrlEntries(
      validateManualUrls([
        "# comentário",
        "",
        "example.com/evento",
        "não é url",
      ]),
    )

    expect(result.entries).toHaveLength(1)
    expect(result.warnings[0]?.message).toBe("Linha 4 ignorada: URL inválida.")
  })

  it("ignora URLs muito longas", () => {
    const result = parseManualUrlEntries([
      `https://example.com/${"a".repeat(3000)}`,
    ])

    expect(result.entries).toHaveLength(0)
    expect(result.warnings[0]?.message).toContain("URL muito longa")
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
    expect(new Set(Object.keys(zip.files))).toEqual(
      new Set(["example.com-2.png", "example.com.png"]),
    )
  })

  it("gera QR codes a partir de URLs digitadas", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mirante-qr-test-"))

    const result = await processQrFiles({
      paths: [],
      urls: ["example.com/evento", "https://mirante.com.br/visita"],
      outputRoot: root,
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.items.map((item) => item.filename)).toEqual([
      "example.com-evento.png",
      "mirante.com.br-visita.png",
    ])
    const zip = await JSZip.loadAsync(await readFile(result.zipPath))
    expect(new Set(Object.keys(zip.files))).toEqual(
      new Set(["example.com-evento.png", "mirante.com.br-visita.png"]),
    )
  })

  it("gera contatos válidos e avisa sobre contatos inválidos", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mirante-qr-test-"))

    const result = await processQrFiles({
      paths: [],
      contacts: [
        { name: "João: Silva", phone: "(11) 97355-8890" },
        { name: "Contato inválido", phone: "123" },
      ],
      outputRoot: root,
      now: new Date(2026, 7, 13, 12, 30, 0),
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      filename: "Joao-Silva.png",
      encodedValue: "https://wa.me/5511973558890",
    })
    expect(
      await readFile(path.join(result.outputDirectory, "Joao-Silva.png")),
    ).not.toHaveLength(0)
    expect(result.warnings).toEqual([
      {
        sourceFile: "Contatos digitados",
        message: "Contato 2 ignorado: nome ou celular inválido.",
      },
    ])

    const zip = await JSZip.loadAsync(await readFile(result.zipPath))
    expect(Object.keys(zip.files)).toEqual(["Joao-Silva.png"])
  })

  it("exige um arquivo, uma URL ou um contato digitado", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mirante-qr-test-"))

    await expect(
      processQrFiles({ paths: [], urls: [], contacts: [], outputRoot: root }),
    ).rejects.toThrow(
      "Selecione ao menos um arquivo, informe uma URL ou digite um contato.",
    )
  })
})
