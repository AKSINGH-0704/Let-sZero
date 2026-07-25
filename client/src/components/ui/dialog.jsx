"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // M37: `w-[calc(100%-2rem)]` replaces `w-full` so the dialog keeps a 1rem
        // gutter on each side instead of sitting edge-to-edge on every phone
        // (measured: zero gutter at 320 and 390 for all five dialogs audited).
        // `.dialog-viewport-fit` caps the height and gives the dialog its own
        // scrollbar — see the comment on that utility in index.css.
        // M39 post-deploy fix (Investigation 4/5): `grid-cols-1` — i.e.
        // `minmax(0,1fr)` — replaces the bare `grid`'s implicit `auto` column.
        // An `auto` column sizes to its items' max-content, so a long campaign
        // title made the DialogHeader ~460px wide *inside* the 328px dialog and
        // spilled the stat cards off-screen (measured). A 1fr track with a 0 min
        // forces children to wrap at the dialog's real width. `overflow-x-hidden`
        // is a backstop so nothing else can ever push a sideways scrollbar.
        "fixed left-[50%] top-[50%] z-50 grid grid-cols-1 w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-x-hidden border bg-background p-6 shadow-lg duration-200 dialog-viewport-fit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      {/* RC-1 — the close affordance was a bare 16px icon: a `target-size`
          (WCAG 2.5.8, serious) failure axe reports on every dialog in the
          app. `p-1` grows the hit area to 24px and `-m-1` pulls the box back
          by the same 4px, so the icon renders in exactly its original
          position — the target grows outward, nothing moves. */}
      <DialogPrimitive.Close className="absolute right-4 top-4 -m-1 inline-flex items-center justify-center p-1 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// M39 post-deploy fix (Investigation 4): the close affordance is absolutely
// positioned at `right-4 top-4`, so any header content in the top-right corner
// slides underneath it. On mobile the old `text-center` made it worse — a long
// title expands symmetrically toward *both* edges, driving its right end straight
// under the X (see the reported Campaign-detail screenshots). Two changes fix it
// for every Dialog at once: `pr-8` reserves a gutter wide enough to clear the
// ~24px close target, and left-aligning the header (these are content dialogs,
// not centered alerts — AlertDialog keeps its own centered header) stops the
// title/date from ever reaching that corner.
const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      // min-w-0 lets the header shrink inside the grid track so a long title
      // wraps instead of setting the column's width (see DialogContent note).
      "flex flex-col space-y-1.5 text-left pr-8 min-w-0",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
