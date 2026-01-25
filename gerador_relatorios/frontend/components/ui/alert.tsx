import * as React from "react"
import { cn } from "@/lib/utils"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive"
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  const base =
    "relative w-full rounded-lg border p-4 text-sm flex gap-2 bg-background text-foreground"
  const variants: Record<string, string> = {
    default: "border-border",
    destructive: "border-destructive/50 text-destructive"
  }
  const classes = cn(base, variants[variant], className)
  return <div role="alert" className={classes} {...props} />
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  const classes = cn("text-sm leading-relaxed", className)
  return <div className={classes} {...props} />
}

