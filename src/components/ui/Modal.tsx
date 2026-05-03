'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={cn(
          'relative bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg',
          'shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]',
          className
        )}
      >
        {/* Header — stays fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted
                       hover:bg-surface-elevated hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content — scrolls if tall */}
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function FormField({
  label,
  error,
  children,
  required,
}: {
  label: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="text-loss ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2.5',
        'text-text-primary placeholder-text-muted text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2.5',
        'text-text-primary text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
        'transition-colors appearance-none cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className={cn(
        'w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2.5',
        'text-text-primary placeholder-text-muted text-sm resize-none',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
}
