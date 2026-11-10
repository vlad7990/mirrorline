'use client'

/**
 * Form controls. Every one is 44px or taller, carries a visible label or an
 * explicit aria-label, and shows the single focus ring theme.css defines.
 *
 * DESIGN.md "components.input": surface fill, text colour, body type, 10px
 * radius, 44px tall, with a 1px border-strong outline.
 * DESIGN.md "Elevation & Depth": the active segment of a segmented control is
 * the one place a shadow is allowed.
 */

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../cn'

/** Shared shell for the text controls, so Input and Textarea cannot drift. */
const FIELD_SHELL = [
  'w-full rounded-md border border-border-strong bg-surface',
  'px-3 font-body text-body text-text',
  'placeholder:text-text-muted',
  'transition-colors duration-150',
  'hover:border-text-muted',
  'disabled:cursor-not-allowed disabled:opacity-55',
  'aria-[invalid=true]:border-danger',
].join(' ')

/* -------------------------------------------------------------------------- */
/* Label                                                                       */
/* -------------------------------------------------------------------------- */

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Mark the few optional fields rather than the many required ones. */
  optional?: boolean
}

export const Label = React.forwardRef<React.ComponentRef<typeof LabelPrimitive.Root>, LabelProps>(
  function Label({ className, optional = false, children, ...props }, ref) {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn('font-body text-label text-text', className)}
        {...props}
      >
        {children}
        {optional ? <span className="ml-1 font-normal text-text-muted">(optional)</span> : null}
      </LabelPrimitive.Root>
    )
  },
)

/* -------------------------------------------------------------------------- */
/* Input / Textarea                                                            */
/* -------------------------------------------------------------------------- */

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/** 44px tall, 10px radius, border-strong outline. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return <input ref={ref} type={type} className={cn(FIELD_SHELL, 'h-11', className)} {...props} />
})

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(FIELD_SHELL, 'min-h-11 resize-y py-2.5', className)}
      {...props}
    />
  )
})

/* -------------------------------------------------------------------------- */
/* Select                                                                      */
/* -------------------------------------------------------------------------- */

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shown until something is chosen. */
  placeholder?: string
  /** Wire this to a <Label htmlFor>. */
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  /** Use when there is no visible label. */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/**
 * Radix Select styled to the tokens. The trigger is a 44px button so it keeps
 * its touch target, and the listbox inherits the card treatment: surface,
 * 1px border, 10px radius, no shadow.
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Choose one',
  id,
  name,
  disabled,
  required,
  className,
  ...aria
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
      required={required}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          FIELD_SHELL,
          'flex h-11 items-center justify-between gap-2 text-left',
          'data-[placeholder]:text-text-muted',
          className,
        )}
        {...aria}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-text-muted"
            strokeWidth={2}
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-md border border-border bg-surface text-text',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex h-11 cursor-default select-none items-center gap-2 rounded-sm pl-3 pr-8',
                  'text-body outline-none',
                  'data-[highlighted]:bg-accent-soft data-[highlighted]:text-on-accent-soft',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-55',
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3 inline-flex">
                  <Check aria-hidden="true" className="size-4" strokeWidth={2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

/* -------------------------------------------------------------------------- */
/* Checkbox                                                                    */
/* -------------------------------------------------------------------------- */

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>

/**
 * A 20px box inside a 44px hit area: the padding holds the touch target while
 * the mark stays small enough to sit beside body text.
 */
export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'inline-grid size-11 shrink-0 place-items-center rounded-md bg-transparent',
        'disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 place-items-center rounded-sm border border-border-strong bg-surface',
          'transition-colors duration-150',
        )}
      >
        {/* Checked state: primary fill with the white tick. */}
        <CheckboxPrimitive.Indicator asChild>
          <span className="grid size-5 place-items-center rounded-sm bg-primary text-on-primary">
            <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
          </span>
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  )
})

/* -------------------------------------------------------------------------- */
/* Switch                                                                      */
/* -------------------------------------------------------------------------- */

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        // A 52x30 track; put it in a 44px row to keep the touch target.
        'inline-flex h-[30px] w-[52px] shrink-0 items-center rounded-full border border-border-strong p-0.5',
        'bg-neutral-soft transition-colors duration-150',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-6 rounded-full bg-surface transition-transform duration-150',
          'data-[state=checked]:translate-x-[22px]',
        )}
      />
    </SwitchPrimitive.Root>
  )
})

/* -------------------------------------------------------------------------- */
/* Slider                                                                      */
/* -------------------------------------------------------------------------- */

export interface SliderProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'aria-label'> {
  /** Names the slider. Lands on the thumb, where the value lives. */
  label: string
  /** One name per thumb when there is more than one. Falls back to `label`. */
  thumbLabels?: readonly string[]
}

/** Accent track. Used for the three tone sliders in the brand kit. */
export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(function Slider({ className, label, thumbLabels, value, defaultValue, ...props }, ref) {
  const thumbCount = (value ?? defaultValue ?? [0]).length

  return (
    <SliderPrimitive.Root
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      className={cn(
        // 44px of vertical room around a 6px track keeps the touch target.
        'relative flex h-11 w-full touch-none select-none items-center',
        'data-[disabled]:opacity-55',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_unused, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels?.[index] ?? label}
          className="block size-5 rounded-full border-2 border-primary bg-surface"
        />
      ))}
    </SliderPrimitive.Root>
  )
})

/* -------------------------------------------------------------------------- */
/* SegmentedControl                                                            */
/* -------------------------------------------------------------------------- */

export interface SegmentedItem {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps {
  items: readonly SegmentedItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Names the group, e.g. "Approval mode". */
  label: string
  className?: string
  /** Optional <SegmentedPanel> children. */
  children?: React.ReactNode
}

/**
 * Radix Tabs with the segmented look. DESIGN.md: "Segmented controls: the
 * active segment may use a very subtle shadow (0 1px 2px rgba(0,0,0,0.08))" —
 * exposed as --shadow-segment, the only shadow in the system.
 */
export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
  children,
}: SegmentedControlProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={onValueChange}
    >
      <TabsPrimitive.List
        aria-label={label}
        className={cn('inline-flex gap-1 rounded-lg bg-neutral-soft p-1', className)}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-md px-4',
              'font-body text-label text-text-muted transition-colors duration-150',
              'data-[state=active]:bg-surface data-[state=active]:text-text',
              'data-[state=active]:shadow-[var(--shadow-segment)]',
              'disabled:pointer-events-none disabled:opacity-55',
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

/** The panel that belongs to a segment. Re-exported so callers stay in Radix. */
export const SegmentedPanel = TabsPrimitive.Content

/* -------------------------------------------------------------------------- */
/* FieldGroup                                                                  */
/* -------------------------------------------------------------------------- */

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export interface FieldGroupProps {
  /** Base id. One is generated when it is omitted. */
  id?: string
  label: React.ReactNode
  hint?: React.ReactNode
  /** When set, the control is marked invalid and the message is announced. */
  error?: React.ReactNode
  optional?: boolean
  className?: string
  /**
   * Either plain children (wire the id yourself) or a function that receives
   * the id and aria wiring, which is the safer path.
   */
  children: React.ReactNode | ((field: FieldControlProps) => React.ReactNode)
}

/** Label + control + hint/error, wired together so nothing is left unnamed. */
export function FieldGroup({
  id,
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: FieldGroupProps) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const field: FieldControlProps = {
    id: fieldId,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={fieldId} optional={optional}>
        {label}
      </Label>
      {typeof children === 'function' ? children(field) : children}
      {hint ? (
        <p id={hintId} className="m-0 text-meta text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="m-0 text-meta font-semibold text-on-danger-soft">
          {error}
        </p>
      ) : null}
    </div>
  )
}
