import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@renderer/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-500 text-white shadow-[0_8px_28px_-8px_rgba(99,102,241,.8)] hover:bg-indigo-400 active:translate-y-px",
        secondary:
          "border border-white/10 bg-white/[.06] text-zinc-100 hover:border-white/20 hover:bg-white/[.1]",
        ghost: "text-zinc-300 hover:bg-white/[.07] hover:text-white",
        danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

export interface ButtonProps
  extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
