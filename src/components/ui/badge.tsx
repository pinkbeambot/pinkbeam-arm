import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-display font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-pink-500 text-white [a&]:hover:bg-pink-600",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-error-500 text-white [a&]:hover:bg-error-600 focus-visible:ring-error-500/20",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-pink-500 underline-offset-4 [a&]:hover:underline",
        // Brand variants
        pink: "bg-pink-500 text-white [a&]:hover:bg-pink-600",
        purple: "bg-accent-purple text-white [a&]:hover:bg-accent-purple/90",
        cyan: "bg-accent-cyan text-white [a&]:hover:bg-accent-cyan/90",
        amber: "bg-accent-amber text-white [a&]:hover:bg-accent-amber/90",
        indigo: "bg-accent-indigo text-white [a&]:hover:bg-accent-indigo/90",
        // Outline variants
        "outline-pink": "border-pink-500 text-pink-500 [a&]:hover:bg-pink-500 [a&]:hover:text-white",
        "outline-purple": "border-accent-purple text-accent-purple [a&]:hover:bg-accent-purple [a&]:hover:text-white",
        // Soft variants
        "soft-pink": "bg-pink-500/10 text-pink-500 [a&]:hover:bg-pink-500/20",
        "soft-purple": "bg-accent-purple/10 text-accent-purple [a&]:hover:bg-accent-purple/20",
        "soft-cyan": "bg-accent-cyan/10 text-accent-cyan [a&]:hover:bg-accent-cyan/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
