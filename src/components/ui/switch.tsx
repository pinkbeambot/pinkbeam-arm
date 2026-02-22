import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

/**
 * Props for the Switch component.
 * @interface SwitchProps
 * @extends {React.ComponentProps<typeof SwitchPrimitive.Root>}
 */
interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  /** Size variant of the switch */
  size?: "sm" | "default"
}

/**
 * Switch component for toggling between on/off states.
 * Supports two sizes and full keyboard accessibility.
 * 
 * @example
 * ```tsx
 * <Switch id="airplane" />
 * <Label htmlFor="airplane">Airplane Mode</Label>
 * 
 * <Switch size="sm" />
 * ```
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Base styles
        "peer inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none",
        "group/switch",
        // State styles
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        // Focus styles
        "focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50",
        // Disabled styles
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Size variants
        "data-[size=default]:h-[1.15rem] data-[size=default]:w-8",
        "data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        // Dark mode
        "dark:data-[state=unchecked]:bg-input/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 transition-transform",
          "group-data-[size=default]/switch:size-4",
          "group-data-[size=sm]/switch:size-3",
          "data-[state=checked]:translate-x-[calc(100%-2px)]",
          "data-[state=unchecked]:translate-x-0",
          // Dark mode
          "dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
export type { SwitchProps }
