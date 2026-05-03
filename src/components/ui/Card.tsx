import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  gradient?: boolean
}

export function Card({ children, className, gradient }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-surface-border',
        gradient ? 'bg-card-gradient' : 'bg-surface-card',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 pt-5 pb-3 border-b border-surface-border', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}) {
  const trendColor = trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-text-secondary'

  return (
    <div className={cn('bg-surface-card border border-surface-border rounded-2xl p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div className="font-financial text-2xl font-semibold text-text-primary mb-1">{value}</div>
      {sub && <div className={cn('text-xs font-medium', trendColor)}>{sub}</div>}
    </div>
  )
}
