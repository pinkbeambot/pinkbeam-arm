"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Command Components using Radix UI patterns
const CommandContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  search: string
  onSearchChange: (search: string) => void
} | null>(null)

function useCommand() {
  const context = React.useContext(CommandContext)
  if (!context) {
    throw new Error("Command components must be used within a Command provider")
  }
  return context
}

interface CommandProps {
  children: React.ReactNode
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}

function Command({ children, className, value, onValueChange }: CommandProps) {
  const [internalValue, setInternalValue] = React.useState(value || "")
  const [search, setSearch] = React.useState("")

  const handleValueChange = React.useCallback((newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }, [onValueChange])

  const contextValue = React.useMemo(() => ({
    value: value ?? internalValue,
    onValueChange: handleValueChange,
    search,
    onSearchChange: setSearch
  }), [value, internalValue, handleValueChange, search])

  return (
    <CommandContext.Provider value={contextValue}>
      <div className={cn("flex flex-col overflow-hidden", className)}>
        {children}
      </div>
    </CommandContext.Provider>
  )
}

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { search, onSearchChange } = useCommand()

    return (
      <div className="flex items-center border-b border-border px-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 shrink-0 opacity-50"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={ref}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = "CommandInput"

interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandList.displayName = "CommandList"

interface CommandEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, children, ...props }, ref) => {
    const { search } = useCommand()
    
    if (!search) return null
    
    return (
      <div
        ref={ref}
        className={cn("py-6 text-center text-sm text-muted-foreground", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandEmpty.displayName = "CommandEmpty"

interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  heading?: string
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, children, heading, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-hidden p-1 text-foreground", className)}
        {...props}
      >
        {heading && (
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {heading}
          </div>
        )}
        <div className="space-y-0.5">{children}</div>
      </div>
    )
  }
)
CommandGroup.displayName = "CommandGroup"

type CommandSeparatorProps = React.HTMLAttributes<HTMLDivElement>

const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("h-px bg-border my-1", className)}
        {...props}
      />
    )
  }
)
CommandSeparator.displayName = "CommandSeparator"

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  value?: string
  onSelect?: () => void
  disabled?: boolean
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, children, value, onSelect, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useCommand()
    const isSelected = selectedValue === value

    const handleClick = React.useCallback(() => {
      if (disabled) return
      if (value) {
        onValueChange(value)
      }
      onSelect?.()
    }, [disabled, value, onValueChange, onSelect])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !disabled) {
        handleClick()
      }
    }, [handleClick, disabled])

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CommandItem.displayName = "CommandItem"

interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

const CommandShortcut = React.forwardRef<HTMLSpanElement, CommandShortcutProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "ml-auto text-xs tracking-widest text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
CommandShortcut.displayName = "CommandShortcut"

// CommandDialog component for the modal-style command palette
interface CommandDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function CommandDialog({ children, open, onOpenChange }: CommandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 gap-0 max-w-[640px]">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
