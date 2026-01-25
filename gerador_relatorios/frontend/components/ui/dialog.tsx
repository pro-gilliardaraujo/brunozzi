import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Dialog({ open = false, children }: DialogProps) {
  return <DialogContext.Provider value={{ open }}>{children}</DialogContext.Provider>
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const ctx = React.useContext(DialogContext)
  if (!ctx?.open) {
    return null
  }
  const overlayClasses =
    "fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-4 py-6"
  const contentClasses = cn(
    "w-full max-w-lg rounded-lg bg-background text-foreground shadow-lg border border-border p-4",
    className
  )
  return (
    <div className={overlayClasses}>
      <div className={contentClasses} {...props}>
        {children}
      </div>
    </div>
  )
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  const classes = cn("flex flex-col space-y-1.5 text-center sm:text-left", className)
  return <div className={classes} {...props} />
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  const classes = cn("text-base font-semibold leading-none tracking-tight", className)
  return <h2 className={classes} {...props} />
}

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const classes = cn("text-sm text-muted-foreground", className)
  return <p className={classes} {...props} />
}

