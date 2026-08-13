import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@renderer/lib/utils"

interface ProgressProps {
  value: number
  className?: string
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={Math.min(100, Math.max(0, value))}
      className={cn(
        "h-2 overflow-hidden rounded-full bg-white/[.08]",
        className,
      )}
    >
      <ProgressPrimitive.Track className="h-full w-full">
        <ProgressPrimitive.Indicator className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-300" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}
