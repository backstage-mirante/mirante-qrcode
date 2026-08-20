import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@renderer/lib/utils"

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root className={cn("w-full", className)} {...props} />
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative inline-flex items-center gap-1 rounded-xl border border-white/[.08] bg-black/25 p-1",
        className,
      )}
      {...props}
    />
  )
}

export function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-zinc-400 transition-colors outline-none select-none hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:pointer-events-none disabled:opacity-45 data-[active]:text-white [&_svg]:pointer-events-none [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export function TabsIndicator({
  className,
  ...props
}: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      className={cn(
        "absolute top-0 left-0 z-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] translate-y-[var(--active-tab-top)] rounded-lg border border-indigo-400/25 bg-indigo-400/[.12] shadow-[0_8px_24px_-14px_rgba(99,102,241,.9)] transition-[translate,width] duration-200 ease-out",
        className,
      )}
      {...props}
    />
  )
}

export function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel className={cn("outline-none", className)} {...props} />
  )
}
