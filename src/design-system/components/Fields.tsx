import { useEffect, useState, useId, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn, formatCompactPkrPreview, parseNumericInput } from '@/utils'
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
  'w-full rounded-control border border-soe-border bg-[#f4f7fa] px-3 text-sm text-soe-ink focus:border-[#0369a1] focus:bg-white focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:bg-soe-canvas disabled:text-soe-slate read-only:bg-soe-canvas'

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

function isZeroFormValue(value: InputHTMLAttributes<HTMLInputElement>['value']) {
  return value === 0 || value === '0'
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function TextField({ label, error, hint, id, className, required, ...props }: TextFieldProps) {
  const { fieldId, errorId, hintId } = useFieldIds(id, props.name)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isEditableNumber = props.type === 'number' && !props.disabled && !props.readOnly
  const [blankInitialZero, setBlankInitialZero] = useState(() =>
    isEditableNumber && isZeroFormValue(props.value),
  )

  useEffect(() => {
    if (!isEditableNumber) {
      setBlankInitialZero(false)
      return
    }
    if (!isZeroFormValue(props.value)) {
      setBlankInitialZero(false)
      return
    }
    if (document.activeElement !== inputRef.current) {
      setBlankInitialZero(true)
    }
  }, [isEditableNumber, props.value])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isEditableNumber) {
      setBlankInitialZero(event.target.value === '')
    }
    props.onChange?.(event)
  }

  const displayValue =
    isEditableNumber && blankInitialZero && isZeroFormValue(props.value) ? '' : props.value

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
        ref={inputRef}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, errorId, hintId)}
        className={cn(controlClass, 'h-10', error && 'border-soe-critical', className)}
        {...props}
        value={displayValue}
        onChange={handleChange}
      />
    </FieldShell>
  )
}

export function PkrAmountInput({
  className,
  value,
  defaultValue,
  previewMinAbs,
  onChange,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { previewMinAbs?: number }) {
  const isControlled = value !== undefined
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isEditable = !props.disabled && !props.readOnly
  const [blankInitialZero, setBlankInitialZero] = useState(() =>
    isEditable && isZeroFormValue(value),
  )
  const [previewSource, setPreviewSource] = useState<number | null>(() =>
    parseNumericInput(value ?? defaultValue),
  )

  useEffect(() => {
    if (isControlled) {
      setPreviewSource(parseNumericInput(value))
    }
  }, [isControlled, value])

  useEffect(() => {
    if (!isEditable) {
      setBlankInitialZero(false)
      return
    }
    if (!isZeroFormValue(value)) {
      setBlankInitialZero(false)
      return
    }
    if (document.activeElement !== inputRef.current) {
      setBlankInitialZero(true)
    }
  }, [isEditable, value])

  const preview = formatCompactPkrPreview(
    isControlled ? value : previewSource,
    previewMinAbs,
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isEditable) {
      setBlankInitialZero(event.target.value === '')
    }
    if (!isControlled) {
      setPreviewSource(parseNumericInput(event.target.value))
    }
    onChange?.(event)
  }

  const displayValue = isEditable && blankInitialZero && isZeroFormValue(value) ? '' : value

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type="number"
        inputMode="decimal"
        value={displayValue}
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={onBlur}
        aria-describedby={preview ? `${props.id ?? props.name}-pkr-preview` : undefined}
        className={cn(
          controlClass,
          'h-10',
          preview && 'pr-[5.25rem]',
          className,
        )}
      />
      {preview ? (
        <span
          id={props.id || props.name ? `${props.id ?? props.name}-pkr-preview` : undefined}
          className="pointer-events-none absolute inset-y-0 right-3 z-[1] flex max-w-[5rem] items-center justify-end truncate text-xs tabular-nums text-soe-slate"
          aria-hidden
        >
          {preview}
        </span>
      ) : null}
    </div>
  )
}

export function CurrencyField({
  label,
  error,
  hint,
  id,
  className,
  required,
  value,
  previewMinAbs,
  type: _type,
  inputMode: _inputMode,
  ...props
}: TextFieldProps & { previewMinAbs?: number }) {
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
      <PkrAmountInput
        id={fieldId}
        required={required}
        value={value}
        previewMinAbs={previewMinAbs}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, errorId, hintId)}
        className={cn(error && 'border-soe-critical', className)}
        {...props}
      />
    </FieldShell>
  )
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
        className={cn(controlClass, 'h-10', error && 'border-soe-critical', className)}
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
      <p className="rounded-control border border-soe-border bg-[#f4f7fa] px-3 py-2.5 text-sm text-soe-ink">
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
        className={cn(controlClass, 'h-10 py-2')}
        onClick={(e) => e.preventDefault()}
        aria-describedby={hintId}
      />
    </FieldShell>
  )
}
