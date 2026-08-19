import type * as React from "react"

import { cn } from "@renderer/lib/utils"

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus-visible:border-indigo-400/50 focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:opacity-45",
        className,
      )}
      {...props}
    />
  )
}
