import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@renderer/lib/utils"

export function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      className={cn(
        "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus-visible:border-indigo-400/50 focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:opacity-45",
        className,
      )}
      {...props}
    />
  )
}
