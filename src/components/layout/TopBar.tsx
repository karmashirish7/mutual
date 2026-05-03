import { formatDate } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Clock className="w-3 h-3" />
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  )
}
