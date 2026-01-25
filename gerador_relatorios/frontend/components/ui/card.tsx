import * as React from "react"
import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  const classes = cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)
  return <div className={classes} {...props} />
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  const classes = cn("p-4", className)
  return <div className={classes} {...props} />
}

