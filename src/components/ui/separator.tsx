import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import { cn } from "@/lib/utils"

/**
 * Props for the Separator component.
 * @interface SeparatorProps
 * @extends {React.ComponentProps<typeof SeparatorPrimitive.Root>}
 */
interface SeparatorProps extends React.ComponentProps<typeof SeparatorPrimitive.Root> {}

/**
 * Separator component for dividing content.
 * Can be horizontal or vertical and is purely decorative by default.
 * 
 * @example
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" className="h-4" />
 * ```
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
export type { SeparatorProps }
