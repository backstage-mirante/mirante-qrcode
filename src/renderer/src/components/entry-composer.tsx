import { IconLink, IconUsers } from "@tabler/icons-react"
import { useState } from "react"

import { ManualContacts } from "@renderer/components/manual-contacts"
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@renderer/components/ui/tabs"
import { UrlComposer } from "@renderer/components/url-composer"
import type { ManualContact } from "@shared/contracts"
import type { QrEntry } from "@shared/qr-core"

type ComposerTab = "url" | "manual"

interface EntryComposerProps {
  urlText: string
  urlEntries: QrEntry[]
  urlInvalidCount: number
  contacts: ManualContact[]
  contactEntries: QrEntry[]
  contactInvalidCount: number
  disabled?: boolean
  canGenerate: boolean
  onUrlChange: (value: string) => void
  onContactsChange: (contacts: ManualContact[]) => void
  onGenerate: () => void
}

export function EntryComposer({
  urlText,
  urlEntries,
  urlInvalidCount,
  contacts,
  contactEntries,
  contactInvalidCount,
  disabled,
  canGenerate,
  onUrlChange,
  onContactsChange,
  onGenerate,
}: EntryComposerProps) {
  const [tab, setTab] = useState<ComposerTab>("url")

  return (
    <section className="mt-4 rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next === "manual" ? "manual" : "url")}
      >
        <TabsList aria-label="Forma de entrada">
          <TabsTab value="url">
            <IconLink /> URL
          </TabsTab>
          <TabsTab value="manual">
            <IconUsers /> Manual
          </TabsTab>
          <TabsIndicator />
        </TabsList>

        <TabsPanel className="mt-4" value="url">
          <UrlComposer
            canGenerate={canGenerate}
            disabled={disabled}
            entries={urlEntries}
            invalidCount={urlInvalidCount}
            value={urlText}
            onChange={onUrlChange}
            onGenerate={onGenerate}
          />
        </TabsPanel>

        <TabsPanel className="mt-4" value="manual">
          <ManualContacts
            canGenerate={canGenerate}
            contacts={contacts}
            disabled={disabled}
            entries={contactEntries}
            invalidCount={contactInvalidCount}
            onChange={onContactsChange}
            onGenerate={onGenerate}
          />
        </TabsPanel>
      </Tabs>
    </section>
  )
}
