import { IconPlus, IconSend, IconTrash, IconUsers } from "@tabler/icons-react"
import { useId, type KeyboardEvent } from "react"

import { PasteButton } from "@renderer/components/paste-button"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { cn } from "@renderer/lib/utils"
import type { ManualContact } from "@shared/contracts"
import {
  contactPhoneDigits,
  formatContactPhone,
  MAX_MANUAL_CONTACTS,
  sanitizeFilename,
  type QrEntry,
} from "@shared/qr-core"

const namePlaceholder = "Ana Lima"
const phonePlaceholder = "(11) 97355-8890"

interface ContactHint {
  text: string
  warning: boolean
}

/** Mostra o nome do arquivo gerado ou avisa que o contato ainda não será usado. */
function contactHint(contact: ManualContact): ContactHint | undefined {
  const name = contact.name.trim()
  const digits = contactPhoneDigits(contact.phone)
  if (name === "" && digits === "") return undefined
  if (name !== "" && (digits.length === 12 || digits.length === 13)) {
    return {
      text: `${sanitizeFilename(name)}.png · wa.me/${digits}`,
      warning: false,
    }
  }
  return {
    text: "Informe o nome e o celular com DDD para gerar este QR code.",
    warning: true,
  }
}

interface ManualContactsProps {
  contacts: ManualContact[]
  entries: QrEntry[]
  invalidCount: number
  disabled?: boolean
  canGenerate: boolean
  onChange: (contacts: ManualContact[]) => void
  onGenerate: () => void
}

export function ManualContacts({
  contacts,
  entries,
  invalidCount,
  disabled,
  canGenerate,
  onChange,
  onGenerate,
}: ManualContactsProps) {
  const fieldId = useId()
  const isEmpty = contacts.every(
    (contact) => contact.name.trim() === "" && contact.phone.trim() === "",
  )

  function updateContact(index: number, patch: Partial<ManualContact>): void {
    onChange(
      contacts.map((contact, position) =>
        position === index ? { ...contact, ...patch } : contact,
      ),
    )
  }

  function removeContact(index: number): void {
    onChange(contacts.filter((_, position) => position !== index))
  }

  function addContact(): void {
    onChange([...contacts, { name: "", phone: "" }])
  }

  function submitOnShortcut(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return
    if (!canGenerate || disabled) return
    event.preventDefault()
    onGenerate()
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
          <IconUsers size={17} />
        </div>
        <h2 className="text-sm font-semibold text-white">Digitar contatos</h2>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Um bloco por contato. O código do país 55 entra automaticamente e o nome
        do arquivo vem do nome normalizado.
      </p>

      <div
        className={cn(
          "space-y-2.5",
          contacts.length > 2 && "-mx-1 max-h-96 overflow-y-auto px-1",
        )}
      >
        {contacts.map((contact, index) => {
          const hint = contactHint(contact)
          const nameId = `${fieldId}-name-${index}`
          const phoneId = `${fieldId}-phone-${index}`

          return (
            <div
              key={index}
              className="rounded-xl border border-white/[.06] bg-black/10 p-3"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">
                  Contato {index + 1}
                </span>
                <Button
                  aria-label={`Remover contato ${index + 1}`}
                  className="text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                  disabled={disabled || contacts.length === 1}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeContact(index)}
                >
                  <IconTrash />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      className="text-xs font-medium text-zinc-400"
                      htmlFor={nameId}
                    >
                      Nome
                    </label>
                    <PasteButton
                      disabled={disabled}
                      label="Colar nome"
                      onPaste={(text) => updateContact(index, { name: text })}
                    />
                  </div>
                  <Input
                    autoComplete="off"
                    disabled={disabled}
                    id={nameId}
                    placeholder={namePlaceholder}
                    spellCheck={false}
                    value={contact.name}
                    onChange={(event) =>
                      updateContact(index, { name: event.target.value })
                    }
                    onKeyDown={submitOnShortcut}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label
                      className="text-xs font-medium text-zinc-400"
                      htmlFor={phoneId}
                    >
                      Telefone
                    </label>
                    <PasteButton
                      disabled={disabled}
                      label="Colar telefone"
                      onPaste={(text) =>
                        updateContact(index, {
                          phone: formatContactPhone(text),
                        })
                      }
                    />
                  </div>
                  <Input
                    autoComplete="off"
                    disabled={disabled}
                    id={phoneId}
                    inputMode="tel"
                    placeholder={phonePlaceholder}
                    value={contact.phone}
                    onChange={(event) =>
                      updateContact(index, {
                        phone: formatContactPhone(event.target.value),
                      })
                    }
                    onKeyDown={submitOnShortcut}
                  />
                </div>
              </div>

              {hint && (
                <p
                  className={cn(
                    "mt-2.5 truncate text-[11px]",
                    hint.warning ? "text-amber-200/75" : "text-zinc-500",
                  )}
                >
                  {hint.text}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Button
        className="mt-3"
        disabled={disabled || contacts.length >= MAX_MANUAL_CONTACTS}
        size="sm"
        variant="secondary"
        onClick={addContact}
      >
        <IconPlus /> Adicionar contato
      </Button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <Badge variant="success">
              {entries.length === 1
                ? "1 contato válido"
                : `${entries.length} contatos válidos`}
            </Badge>
          )}
          {invalidCount > 0 && (
            <Badge variant="warning">
              {invalidCount === 1
                ? "1 contato ignorado"
                : `${invalidCount} contatos ignorados`}
            </Badge>
          )}
          {isEmpty && (
            <span className="text-[11px] text-zinc-500">
              Ctrl + Enter para gerar
            </span>
          )}
        </div>
        <Button disabled={!canGenerate || disabled} onClick={onGenerate}>
          <IconSend /> GERAR
        </Button>
      </div>
    </div>
  )
}
