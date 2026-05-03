import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard, Card, CardHeader, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { PortfolioAllocationChart } from '@/components/dashboard/PortfolioAllocationChart'
import {
  formatCurrency, formatNumber, formatPercent,
  formatDate, TRANSACTION_LABELS, TRANSACTION_COLORS,
} from '@/lib/utils'
import {
  TrendingUp, Wallet, Activity, AlertTriangle,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'
import type { Profile, FundStats, UnitLedger, Transaction, PortfolioAsset, Request } from '@/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileRes.data as Profile

  if (profile.role === 'super_admin') redirect('/admin')

  const [statsRes, ledgerRes, txRes, assetsRes, requestsRes] = await Promise.all([
    supabase.from('fund_stats').select('*').eq('id', 1).single(),
    supabase.from('unit_ledger').select('*').eq('member_id', user.id).single(),
    supabase.from('transactions')
      .select('*, member:member_id(full_name), performer:performed_by(full_name)')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('portfolio_assets').select('*').eq('is_active', true),
    supabase.from('requests')
      .select('*')
      .eq('member_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = statsRes.data as FundStats | null
  const ledger = ledgerRes.data as UnitLedger | null
  const transactions = (txRes.data ?? []) as Transaction[]
  const assets = (assetsRes.data ?? []) as PortfolioAsset[]
  const myRequests = (requestsRes.data ?? []) as Request[]

  const nav = stats?.nav ?? 100
  const totalFundValue = stats?.total_fund_value ?? 0
  const totalUnits = stats?.total_units ?? 0
  const cashBalance = stats?.cash_balance ?? 0

  const myUnits = ledger?.units ?? 0
  const myInvested = ledger?.total_invested ?? 0
  const myCurrentValue = myUnits * nav
  const grossPnL = myCurrentValue - myInvested
  // 5% of any profit goes to the fund manager; members see their net receivable
  const fundManagerFee = grossPnL > 0 ? grossPnL * 0.05 : 0
  const myPnL = grossPnL - fundManagerFee
  const netReceivable = myInvested + myPnL
  const myPnLPct = myInvested > 0 ? (myPnL / myInvested) * 100 : 0
  const myOwnershipPct = totalUnits > 0 ? (myUnits / totalUnits) * 100 : 0

  const pendingRequests = myRequests.filter(r => r.status === 'pending')

  return (
    <div>
      <TopBar
        title="My Portfolio"
        subtitle={`Welcome back, ${profile.full_name.split(' ')[0]}`}
      />

      <div className="p-6 space-y-6">
        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-warning/5 border border-warning/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-warning">Private Group — </span>
            This is a private investment group among friends. Investments are subject to market risk.
            No guaranteed returns. Not a registered financial institution.
          </p>
        </div>

        {/* Pending request notice */}
        {pendingRequests.length > 0 && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="text-sm text-text-secondary">
              You have <span className="font-semibold text-primary">{pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}</span> awaiting admin approval.
            </p>
            <a href="/requests" className="text-xs text-primary hover:underline font-medium">View →</a>
          </div>
        )}

        {/* Personal Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="My Units"
            value={formatNumber(myUnits, 4)}
            icon={Activity}
            sub={`${myOwnershipPct.toFixed(2)}% fund ownership`}
          />
          <StatCard
            label="Amount Invested"
            value={formatCurrency(myInvested)}
            icon={Wallet}
            sub="Total capital deployed"
          />
          <StatCard
            label="Receivable Value"
            value={formatCurrency(netReceivable)}
            icon={TrendingUp}
            trend={myPnL >= 0 ? 'up' : 'down'}
            sub={`${formatPercent(myPnLPct)} return`}
          />
          <StatCard
            label="Net Profit / Loss"
            value={`${myPnL >= 0 ? '+' : ''}${formatCurrency(Math.abs(myPnL))}`}
            trend={myPnL >= 0 ? 'up' : 'down'}
            sub={fundManagerFee > 0 ? `After 5% mgmt fee (${formatCurrency(fundManagerFee)})` : `NAV: ${formatNumber(nav, 4)}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Allocation */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Portfolio Allocation</h3>
              <p className="text-xs text-text-muted mt-0.5">Fund-wide holdings</p>
            </CardHeader>
            <CardContent>
              <PortfolioAllocationChart assets={assets} cashBalance={cashBalance} />
            </CardContent>
          </Card>

          {/* My Recent Transactions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">My Transactions</h3>
                <a href="/transactions" className="text-xs text-primary hover:underline">View all</a>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {transactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-sm">
                  No transactions yet.{' '}
                  <a href="/requests" className="text-primary hover:underline">Submit a buy request</a> to get started.
                </div>
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
                            <p className="text-xs text-text-muted">{formatDate(tx.created_at)}</p>
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

        {/* My Recent Requests */}
        {myRequests.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">My Requests</h3>
                <a href="/requests" className="text-xs text-primary hover:underline">View all</a>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {['Type', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {myRequests.map(req => (
                      <tr key={req.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className={`font-medium text-sm ${req.request_type === 'buy_units' ? 'text-profit' : 'text-loss'}`}>
                            {req.request_type === 'buy_units' ? '↑ Buy Units' : '↓ Sell Units'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-financial text-text-primary">
                          {req.amount != null ? formatCurrency(req.amount) : req.units != null ? `${formatNumber(req.units, 4)} units` : '—'}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                        <td className="px-5 py-3.5 text-text-muted text-xs">{formatDate(req.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
