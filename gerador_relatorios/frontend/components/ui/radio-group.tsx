import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupContextValue {
  value: string
  setValue: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function RadioGroup({ value, defaultValue, onValueChange, className, children, ...props }: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const currentValue = value !== undefined ? value : internalValue
  const setValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next)
    }
    if (onValueChange) {
      onValueChange(next)
    }
  }
  return (
    <RadioGroupContext.Provider value={{ value: currentValue, setValue }}>
      <div className={className} role="radiogroup" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext)
    const checked = ctx?.value === value
    const classes = cn(
      "h-4 w-4 rounded-full border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (props.onChange) {
        props.onChange(event)
      }
      if (!event.defaultPrevented && ctx) {
        ctx.setValue(value)
      }
    }
    return (
      <input
        ref={ref}
        id={id}
        type="radio"
        className={classes}
        checked={checked}
        onChange={handleChange}
        value={value}
        {...props}
      />
    )
  }
)

RadioGroupItem.displayName = "RadioGroupItem"

