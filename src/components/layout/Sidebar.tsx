'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TrendingUp, LayoutDashboard, PieChart,
  ArrowLeftRight, ClipboardList, Users, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'
import type { Profile } from '@/types'

const memberNav = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/portfolio',    label: 'Portfolio',    icon: PieChart },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/requests',     label: 'Requests',     icon: ClipboardList },
]

const adminNav = [
  { href: '/admin',        label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/portfolio',    label: 'Portfolio',    icon: PieChart },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/requests',     label: 'Requests',     icon: ClipboardList },
  { href: '/members',      label: 'Members',      icon: Users },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const nav = profile.role === 'super_admin' ? adminNav : memberNav

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0d0f14] border-r border-surface-border flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold gradient-text">FIP</h1>
            <p className="text-[10px] text-text-muted">Friends Investment Pool</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-current')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-surface-border pt-3 space-y-2">
        {/* Role badge */}
        <div className="px-3 py-2.5 rounded-xl bg-surface-elevated">
          <p className="text-xs font-semibold text-text-primary truncate">{profile.full_name}</p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {profile.role === 'super_admin' ? '⚡ Super Admin' : '👤 Member'}
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                       text-text-secondary hover:bg-loss/10 hover:text-loss transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
