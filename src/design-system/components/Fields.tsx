import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils'
import { LabelText, HelperText } from '@/design-system/foundations/Layout'

interface FieldShellProps {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  errorId?: string
  hintId?: string
  children: ReactNode
}

function FieldShell({
  label,
  htmlFor,
  required,
  error,
  hint,
  errorId,
  hintId,
  children,
}: FieldShellProps) {
  return (
    <div className="block space-y-1.5">
      <label htmlFor={htmlFor} className="block">
        <LabelText>
          {label}
          {required ? <span className="text-soe-critical"> *</span> : null}
        </LabelText>
      </label>
      {children}
      {hint && !error ? (
        <HelperText id={hintId}>{hint}</HelperText>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-soe-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-control border border-soe-border bg-white px-3 text-sm text-soe-ink focus:border-soe-blue focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:bg-soe-canvas disabled:text-soe-slate read-only:bg-soe-canvas'

function useFieldIds(id?: string, name?: string) {
  const autoId = useId()
  const fieldId = id ?? name ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  return { fieldId, errorId, hintId }
}

function describedBy(error?: string, hint?: string, errorId?: string, hintId?: string) {
  if (error && errorId) return errorId
  if (hint && !error && hintId) return hintId
  return undefined
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, id, className, required, ...props }: TextFieldProps) {
  const { fieldId, errorId, hintId } = useFieldIds(id, props.name)
  return (
    <FieldShell
      label={label}
      htmlFor={fieldId}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
    >
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, errorId, hintId)}
        className={cn(controlClass, 'h-[42px]', error && 'border-soe-critical', className)}
        {...props}
      />
    </FieldShell>
  )
}

export function CurrencyField(props: TextFieldProps) {
  return <TextField inputMode="decimal" {...props} />
}

export function PercentField(props: TextFieldProps) {
  return <TextField inputMode="decimal" {...props} />
}

export function DateField(props: TextFieldProps) {
  return <TextField type="date" {...props} />
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export function SelectField({
  label,
  error,
  hint,
  id,
  className,
  required,
  options,
  placeholder,
  ...props
}: SelectFieldProps) {
  const { fieldId, errorId, hintId } = useFieldIds(id, props.name)
  return (
    <FieldShell
      label={label}
      htmlFor={fieldId}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
    >
      <select
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, errorId, hintId)}
        className={cn(controlClass, 'h-[42px]', error && 'border-soe-critical', className)}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
}

export function TextareaField({
  label,
  error,
  hint,
  id,
  className,
  required,
  ...props
}: TextareaFieldProps) {
  const { fieldId, errorId, hintId } = useFieldIds(id, props.name)
  return (
    <FieldShell
      label={label}
      htmlFor={fieldId}
      required={required}
      error={error}
      hint={hint}
      errorId={errorId}
      hintId={hintId}
    >
      <textarea
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, errorId, hintId)}
        className={cn(controlClass, 'min-h-24 py-2', error && 'border-soe-critical', className)}
        {...props}
      />
    </FieldShell>
  )
}

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function CheckboxField({ label, error, id, className, ...props }: CheckboxFieldProps) {
  const { fieldId, errorId } = useFieldIds(id, props.name)
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="flex items-center gap-2 text-sm text-soe-ink">
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn('h-4 w-4', className)}
          {...props}
        />
        {label}
      </label>
      {error ? (
        <p id={errorId} className="text-xs text-soe-critical" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface RadioGroupProps {
  label: string
  name: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
  error?: string
}

export function RadioGroup({ label, name, value, onChange, options, error }: RadioGroupProps) {
  const errorId = `${name}-error`
  return (
    <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
      <legend className="text-xs font-medium text-soe-ink">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-soe-ink">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange?.(o.value)}
              aria-invalid={error ? true : undefined}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-soe-critical" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

export function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <LabelText>{label}</LabelText>
      <p className="rounded-control border border-soe-border bg-soe-canvas px-3 py-2.5 text-sm text-soe-ink">
        {value}
      </p>
    </div>
  )
}

export function MockFileControl({
  label,
  hint = 'Demo upload — files are not stored in this environment.',
}: {
  label: string
  hint?: string
}) {
  const { fieldId, hintId } = useFieldIds()
  return (
    <FieldShell label={label} htmlFor={fieldId} hint={hint} hintId={hintId}>
      <input
        id={fieldId}
        type="file"
        className={cn(controlClass, 'h-[42px] py-2')}
        onClick={(e) => e.preventDefault()}
        aria-describedby={hintId}
      />
    </FieldShell>
  )
}
