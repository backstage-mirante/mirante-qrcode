import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@renderer/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-indigo-400/20 bg-indigo-400/10 text-indigo-200",
        success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
        neutral: "border-white/10 bg-white/[.06] text-zinc-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
