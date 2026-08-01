import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // M50 — the TRACK now carries a border. Without one the whole control read as a
      // flat strip of text rather than a control, which is the report's headline
      // complaint. Uses --border, an existing token, so no palette is introduced.
      "inline-flex h-10 items-center justify-center rounded-md border border-border bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

// M50 — the ACTIVE pill needs an edge, not just a fill. In dark mode
// --background (11% L) is DARKER than --muted (13% L), so "selected" rendered as a
// darker patch on a lighter track: the exact inverse of the raised-pill reading
// this idiom borrows from light mode. A border at --border (17% L) is lighter than
// both, so the pill reads as raised in either theme without changing the fill or
// inventing a colour. `hover:text-foreground` gives the inactive segment a
// non-colour cue that it is reachable.
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background dark:data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border hover:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
