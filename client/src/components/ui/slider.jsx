import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

// M35-A — `thumbProps` forwards attributes to the Thumb rather than the Root.
//
// Radix puts role="slider" and its own aria-valuenow/min/max on the Thumb, so
// any aria-* passed to this component previously landed on the Root — a span
// with no slider role — and was ignored. The pricing calculator was passing
// aria-valuenow={credits} and aria-valuetext="14,000 credits" that way, so a
// screen reader announced the raw internal position ("335") instead of the
// credit amount, and the valuetext was dropped entirely. Verified in a browser:
// the thumb's aria-valuetext read null.
//
// aria-valuetext is the right lever: Radix owns aria-valuenow, but valuetext
// takes precedence over it when assistive technology announces the value.
const Slider = React.forwardRef(({ className, thumbProps, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      {...thumbProps}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
