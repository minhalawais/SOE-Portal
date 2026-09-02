import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button, IconButton } from '@/design-system/components/Button'
import { useFocusTrap } from '@/utils/focusTrap'
import { cn } from '@/utils'

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef, onClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-soe-navy/40"
        aria-label="Close dialog"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="soe-modal-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-modal border border-soe-border bg-white shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center justify-between border-b border-soe-border px-4 py-3">
          <h2 id="soe-modal-title" className="text-base font-semibold text-soe-navy">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="overflow-auto px-4 py-4 text-sm text-soe-ink">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-soe-border px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'primary',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  tone?: 'primary' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="tertiary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone === 'destructive' ? 'destructive' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}

export function Drawer({
  open,
  title,
  children,
  onClose,
  size = 'md',
}: PropsWithChildren<{
  open: boolean
  title: string
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
}>) {
  const panelRef = useRef<HTMLElement>(null)
  const [rendered, setRendered] = useState(open)
  const [entered, setEntered] = useState(false)
  useFocusTrap(open, panelRef, onClose)

  useEffect(() => {
    if (open) {
      setRendered(true)
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }
    setEntered(false)
    const timeout = window.setTimeout(() => setRendered(false), 220)
    return () => window.clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!rendered) return null

  const widthClass =
    size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return createPortal(
    <div className="fixed inset-0 z-[50]">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-soe-navy/35 transition-opacity duration-200',
          entered ? 'opacity-100' : 'opacity-0',
        )}
        aria-label="Close drawer"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="soe-drawer-title"
        className={cn(
          'absolute right-0 top-0 flex h-full w-full flex-col border-l border-soe-border bg-white shadow-[var(--shadow-modal)] transition-transform duration-200 ease-out',
          widthClass,
          entered ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-soe-border px-4 py-3">
          <h2 id="soe-drawer-title" className="text-base font-semibold text-soe-navy">
            {title}
          </h2>
          <IconButton label="Close drawer" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-auto p-4 text-sm">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-soe-navy px-2 py-1 text-[11px] text-white opacity-0 transition',
          'group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {content}
      </span>
    </span>
  )
}
