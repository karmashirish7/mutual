import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Card'
import { PortfolioAllocationChart } from '@/components/dashboard/PortfolioAllocationChart'
import { AdminActions } from '@/components/dashboard/AdminActions'
import {
  formatCurrency, formatNumber, formatPercent,
  formatDate, TRANSACTION_LABELS, TRANSACTION_COLORS,
} from '@/lib/utils'
import {
  TrendingUp, Wallet, Activity, AlertTriangle,
  ArrowUpRight, ArrowDownLeft, ClipboardList,
} from 'lucide-react'
import type { Profile, FundStats, UnitLedger, Transaction, PortfolioAsset } from '@/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, statsRes, txRes, assetsRes, membersRes, pendingRes, ledgersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('fund_stats').select('*').eq('id', 1).single(),
    supabase.from('transactions')
      .select('*, member:member_id(full_name), performer:performed_by(full_name)')
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('portfolio_assets').select('*').eq('is_active', true),
    supabase.from('profiles').select('*').eq('is_active', true),
    supabase.from('requests').select('id').eq('status', 'pending'),
    supabase.from('unit_ledger').select('*'),
  ])

  const profile = profileRes.data as Profile
  if (profile.role !== 'super_admin') redirect('/dashboard')

  const stats = statsRes.data as FundStats | null
  const transactions = (txRes.data ?? []) as Transaction[]
  const assets = (assetsRes.data ?? []) as PortfolioAsset[]
  const members = (membersRes.data ?? []) as Profile[]
  const pendingCount = (pendingRes.data ?? []).length
  const ledgers = (ledgersRes.data ?? []) as UnitLedger[]

  const nav = stats?.nav ?? 100
  const totalFundValue = stats?.total_fund_value ?? 0
  const totalUnits = stats?.total_units ?? 0
  const cashBalance = stats?.cash_balance ?? 0

  // Total 5% fund manager fee accrued across all profitable members
  const totalFundManagerFee = ledgers.reduce((sum, l) => {
    const grossPnL = (l.units * nav) - l.total_invested
    return sum + (grossPnL > 0 ? grossPnL * 0.05 : 0)
  }, 0)

  return (
    <div>
      <TopBar
        title="Admin Dashboard"
        subtitle="Fund overview & management"
        actions={<AdminActions members={members} currentFundValue={totalFundValue} />}
      />

      <div className="p-6 space-y-6">
        {/* Pending requests alert */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between bg-warning/5 border border-warning/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-warning">{pendingCount} pending request{pendingCount > 1 ? 's' : ''}</span>
                {' '}awaiting your approval.
              </p>
            </div>
            <a href="/requests" className="text-xs text-warning hover:underline font-medium">Review →</a>
          </div>
        )}

        {/* Fund Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Fund Value"
            value={formatCurrency(totalFundValue)}
            icon={Wallet}
            sub={`NAV: ${formatNumber(nav, 4)}`}
          />
          <StatCard
            label="Total Units Issued"
            value={formatNumber(totalUnits, 4)}
            icon={Activity}
            sub="Units outstanding"
          />
          <StatCard
            label="Cash Balance"
            value={formatCurrency(cashBalance)}
            icon={TrendingUp}
            sub={`${totalFundValue > 0 ? ((cashBalance / totalFundValue) * 100).toFixed(1) : '0'}% of fund`}
          />
          <StatCard
            label="Pending Requests"
            value={String(pendingCount)}
            icon={ClipboardList}
            sub={pendingCount > 0 ? 'Action required' : 'All clear'}
          />
        </div>

        {/* Fund Manager Balance — admin only */}
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Fund Manager Balance</p>
            <p className="text-2xl font-financial font-semibold text-primary">{formatCurrency(totalFundManagerFee)}</p>
            <p className="text-xs text-text-muted mt-1">5% of all members&apos; unrealised profits (admin-only view)</p>
          </div>
          <TrendingUp className="w-10 h-10 text-primary/30" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Allocation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Portfolio Allocation</h3>
            </CardHeader>
            <CardContent>
              <PortfolioAllocationChart assets={assets} cashBalance={cashBalance} />
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
                <a href="/transactions" className="text-xs text-primary hover:underline">View all</a>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-sm">No transactions yet</div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {transactions.map((tx) => {
                    const isInflow = ['deposit', 'unit_issue'].includes(tx.transaction_type)
                    const isOutflow = ['withdrawal', 'unit_redemption'].includes(tx.transaction_type)
                    return (
                      <li key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-elevated/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            isInflow ? 'bg-profit/10' : isOutflow ? 'bg-loss/10' : 'bg-primary/10'
                          )}>
                            {isInflow
                              ? <ArrowUpRight className="w-4 h-4 text-profit" />
                              : isOutflow
                                ? <ArrowDownLeft className="w-4 h-4 text-loss" />
                                : <Activity className="w-4 h-4 text-primary" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {TRANSACTION_LABELS[tx.transaction_type] ?? tx.transaction_type}
                            </p>
                            <p className="text-xs text-text-muted">
                              {(tx.member as unknown as { full_name: string })?.full_name ?? '—'} · {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.amount != null && (
                            <p className={cn('text-sm font-financial font-medium', TRANSACTION_COLORS[tx.transaction_type])}>
                              {isOutflow ? '−' : '+'}{formatCurrency(tx.amount)}
                            </p>
                          )}
                          {tx.units != null && (
                            <p className="text-xs text-text-muted font-financial">{formatNumber(tx.units, 4)} units</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Member Ownership Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Member Ownership</h3>
              <a href="/members" className="text-xs text-primary hover:underline">Manage members →</a>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <MemberOwnershipTable members={members} nav={nav} totalUnits={totalUnits} ledgers={ledgers} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MemberOwnershipTable({
  members, nav, totalUnits, ledgers,
}: {
  members: Profile[]
  nav: number
  totalUnits: number
  ledgers: UnitLedger[]
}) {
  const ledgerMap = new Map(ledgers.map((l) => [l.member_id, l]))

  const memberRows = members
    .filter(m => m.role === 'member')
    .map(m => {
      const ledger = ledgerMap.get(m.id)
      const units = ledger?.units ?? 0
      const invested = ledger?.total_invested ?? 0
      const currentValue = units * nav
      const grossPnL = currentValue - invested
      const mgmtFee = grossPnL > 0 ? grossPnL * 0.05 : 0
      const netPnL = grossPnL - mgmtFee
      const netPnLPct = invested > 0 ? (netPnL / invested) * 100 : 0
      const ownershipPct = totalUnits > 0 ? (units / totalUnits) * 100 : 0
      return { member: m, units, invested, currentValue, grossPnL, mgmtFee, netPnL, netPnLPct, ownershipPct }
    })
    .sort((a, b) => b.units - a.units)

  if (memberRows.length === 0) {
    return <div className="py-8 text-center text-text-muted text-sm">No members yet. Invite members from the Members page.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border">
            {['Member', 'Units', 'Invested', 'Current Value', 'Gross P&L', 'Mgmt Fee (5%)', 'Net P&L', 'Ownership'].map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {memberRows.map(({ member, units, invested, currentValue, grossPnL, mgmtFee, netPnL, netPnLPct, ownershipPct }) => (
            <tr key={member.id} className="hover:bg-surface-elevated/40 transition-colors">
              <td className="px-5 py-3.5">
                <div>
                  <p className="font-medium text-text-primary">{member.full_name}</p>
                  <p className="text-xs text-text-muted">{member.email}</p>
                </div>
              </td>
              <td className="px-5 py-3.5 font-financial text-text-primary">{formatNumber(units, 4)}</td>
              <td className="px-5 py-3.5 font-financial text-text-primary">{formatCurrency(invested)}</td>
              <td className="px-5 py-3.5 font-financial text-text-primary">{formatCurrency(currentValue)}</td>
              <td className={cn('px-5 py-3.5 font-financial font-medium', grossPnL >= 0 ? 'text-profit' : 'text-loss')}>
                {grossPnL >= 0 ? '+' : ''}{formatCurrency(grossPnL)}
              </td>
              <td className="px-5 py-3.5 font-financial text-primary font-medium">
                {mgmtFee > 0 ? `−${formatCurrency(mgmtFee)}` : '—'}
              </td>
              <td className={cn('px-5 py-3.5 font-financial font-medium', netPnL >= 0 ? 'text-profit' : 'text-loss')}>
                {netPnL >= 0 ? '+' : ''}{formatCurrency(netPnL)}
                <span className="ml-1.5 text-xs opacity-70">{formatPercent(netPnLPct)}</span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-border rounded-full h-1.5 max-w-[80px]">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(ownershipPct, 100)}%` }} />
                  </div>
                  <span className="font-financial text-text-secondary text-xs">{ownershipPct.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
