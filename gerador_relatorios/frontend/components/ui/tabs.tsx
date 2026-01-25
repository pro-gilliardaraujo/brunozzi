import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const currentValue = value !== undefined ? value : internalValue
  const handleSetValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next)
    }
    if (onValueChange) {
      onValueChange(next)
    }
  }
  return (
    <TabsContext.Provider value={{ value: currentValue, setValue: handleSetValue }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className, ...props }: TabsListProps) {
  const classes = cn("inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)
  return <div className={classes} {...props} />
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value
  const classes = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground",
    className
  )
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) {
      props.onClick(event)
    }
    if (!event.defaultPrevented && ctx) {
      ctx.setValue(value)
    }
  }
  return (
    <button
      type="button"
      data-state={isActive ? "active" : "inactive"}
      className={classes}
      onClick={handleClick}
      {...props}
    />
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value
  const classes = cn(
    "mt-2 border-t pt-2 outline-none focus-visible:outline-none",
    !isActive && "hidden",
    className
  )
  return <div data-state={isActive ? "active" : "inactive"} className={classes} {...props} />
}

