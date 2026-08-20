import { describe, expect, it } from "vitest"

import {
  contactPhoneDigits,
  formatContactPhone,
  parseManualContactEntries,
  parseWorksheetEntries,
  validateManualContacts,
} from "./qr-core"

describe("formatContactPhone", () => {
  it("formata o telefone progressivamente durante a digitação", () => {
    expect(formatContactPhone("1")).toBe("(1")
    expect(formatContactPhone("11")).toBe("(11")
    expect(formatContactPhone("119735")).toBe("(11) 9735")
    expect(formatContactPhone("1197355889")).toBe("(11) 9735-5889")
    expect(formatContactPhone("11973558890")).toBe("(11) 97355-8890")
  })

  it("formata um número internacional colado e limita a treze dígitos", () => {
    expect(formatContactPhone("+55 11 97355-8890")).toBe(
      "+55 (11) 97355-8890",
    )
    expect(formatContactPhone("551197355889012345")).toBe(
      "+55 (11) 97355-8890",
    )
  })

  it("descarta uma entrada sem dígitos", () => {
    expect(formatContactPhone("")).toBe("")
    expect(formatContactPhone("abc")).toBe("")
  })
})

describe("contactPhoneDigits", () => {
  it("adiciona o código do país uma única vez", () => {
    expect(contactPhoneDigits("(11) 97355-8890")).toBe("5511973558890")
    expect(contactPhoneDigits("+55 11 97355-8890")).toBe("5511973558890")
  })
})

describe("parseManualContactEntries", () => {
  it("cria o link do WhatsApp e reutiliza o nome de arquivo da planilha", () => {
    const manual = parseManualContactEntries([
      { name: "João da Silva", phone: "(11) 97355-8890" },
    ])
    const worksheet = parseWorksheetEntries(
      [
        ["Nome", "Celular"],
        ["João da Silva", "(11) 97355-8890"],
      ],
      "Contatos",
      "contatos.xlsx",
    )

    expect(manual.entries).toEqual([
      {
        filename: "Joao-da-Silva.png",
        value: "https://wa.me/5511973558890",
        sourceFile: "Contatos digitados",
      },
    ])
    expect(manual.entries[0]?.filename).toBe(worksheet.entries[0]?.filename)
  })

  it("avisa a posição de contatos inválidos e ignora uma linha vazia", () => {
    const result = parseManualContactEntries([
      { name: "", phone: "" },
      { name: "", phone: "(11) 97355-8890" },
      { name: "Ana", phone: "123" },
    ])

    expect(result.entries).toHaveLength(0)
    expect(result.warnings).toEqual([
      {
        sourceFile: "Contatos digitados",
        message: "Contato 2 ignorado: nome ou celular inválido.",
      },
      {
        sourceFile: "Contatos digitados",
        message: "Contato 3 ignorado: nome ou celular inválido.",
      },
    ])
  })
})

describe("validateManualContacts", () => {
  it("limita o tamanho de cada campo informado", () => {
    const contacts = [{ name: "A".repeat(260), phone: "1".repeat(60) }]
    const [row] = validateManualContacts(contacts)

    expect(row?.name).toHaveLength(200)
    expect(row?.phone).toHaveLength(40)
  })

  it("rejeita mais de quinhentos contatos preenchidos", () => {
    const contacts = Array.from({ length: 501 }, () => ({
      name: "Ana",
      phone: "11973558890",
    }))

    expect(() => validateManualContacts(contacts)).toThrow(
      "Informe no máximo 500 contatos por vez.",
    )
  })

  it("mantém as posições quando há linhas vazias e preenchidas", () => {
    const contacts = [
      { name: "", phone: "" },
      { name: "Ana", phone: "11973558890" },
      { name: "   ", phone: " " },
    ]

    expect(validateManualContacts(contacts)).toEqual(contacts)
  })
})
