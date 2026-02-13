import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
  errorMessage?: string;
}

function Input({ className, type, error, errorMessage, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        type={type}
        data-slot="input"
        data-error={error}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-lg border bg-transparent px-4 py-2 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-pink-500 focus-visible:ring-pink-500/30 focus-visible:ring-[3px]",
          error && "border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/30",
          className
        )}
        {...props}
      />
      {error && errorMessage && (
        <p className="mt-1.5 text-sm text-error-500 font-body">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export { Input }
