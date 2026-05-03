import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-profit/10 text-profit border-profit/20',
  danger: 'bg-loss/10 text-loss border-loss/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  muted: 'bg-surface-elevated text-text-muted border-surface-border',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: { label: 'Pending', variant: 'warning' as BadgeVariant },
    approved: { label: 'Approved', variant: 'success' as BadgeVariant },
    rejected: { label: 'Rejected', variant: 'danger' as BadgeVariant },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}
