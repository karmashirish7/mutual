import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PortfolioAllocationChart } from '@/components/dashboard/PortfolioAllocationChart'
import { AddAssetButton } from '@/components/portfolio/AddAssetButton'
import { AssetActions } from '@/components/portfolio/AssetActions'
import { formatCurrency, formatNumber, formatPercent, ASSET_TYPE_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Profile, PortfolioAsset, FundStats } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, statsRes, assetsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('fund_stats').select('*').eq('id', 1).single(),
    supabase.from('portfolio_assets').select('*').eq('is_active', true).order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data as Profile
  const stats = statsRes.data as FundStats | null
  const assets = (assetsRes.data ?? []) as PortfolioAsset[]
  const isAdmin = profile.role === 'super_admin'
  const cashBalance = stats?.cash_balance ?? 0

  const totalPortfolioValue = assets.reduce((sum, a) => sum + a.quantity * a.current_price, 0) + cashBalance

  return (
    <div>
      <TopBar
        title="Portfolio"
        subtitle="All holdings and asset performance"
        actions={isAdmin ? <AddAssetButton /> : undefined}
      />

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Allocation</h3>
            </CardHeader>
            <CardContent>
              <PortfolioAllocationChart assets={assets} cashBalance={cashBalance} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="text-sm font-semibold text-text-primary">Portfolio Summary</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Total Value</p>
                  <p className="font-financial text-xl font-semibold text-text-primary">{formatCurrency(totalPortfolioValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Invested</p>
                  <p className="font-financial text-xl font-semibold text-text-primary">
                    {formatCurrency(assets.reduce((s, a) => s + a.quantity * a.buy_price, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Unrealized P&L</p>
                  {(() => {
                    const cost = assets.reduce((s, a) => s + a.quantity * a.buy_price, 0)
                    const value = assets.reduce((s, a) => s + a.quantity * a.current_price, 0)
                    const pnl = value - cost
                    const pct = cost > 0 ? (pnl / cost) * 100 : 0
                    return (
                      <p className={cn('font-financial text-xl font-semibold', pnl >= 0 ? 'text-profit' : 'text-loss')}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        <span className="text-sm ml-1">{formatPercent(pct)}</span>
                      </p>
                    )
                  })()}
                </div>
              </div>
              {/* Cash position */}
              <div className="bg-surface-elevated rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Cash Balance</p>
                  <p className="font-financial font-semibold text-text-primary mt-0.5">{formatCurrency(cashBalance)}</p>
                </div>
                <Badge variant="info">Cash</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Asset Table */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-primary">Holdings ({assets.length})</h3>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Asset', 'Type', 'Qty', 'Buy Price', 'Current Price', 'Value', 'P&L', isAdmin ? 'Actions' : ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {assets.map(asset => {
                    const value = asset.quantity * asset.current_price
                    const cost = asset.quantity * asset.buy_price
                    const pnl = value - cost
                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
                    return (
                      <tr key={asset.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-medium text-text-primary">{asset.asset_name}</p>
                            {asset.symbol && <p className="text-xs text-text-muted">{asset.symbol}</p>}
                            {asset.sector && <p className="text-xs text-text-muted">{asset.sector}</p>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={asset.asset_type === 'stock' ? 'default' : asset.asset_type === 'mutual_fund' ? 'success' : 'muted'}>
                            {ASSET_TYPE_LABELS[asset.asset_type]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 font-financial text-text-primary">{formatNumber(asset.quantity, 4)}</td>
                        <td className="px-5 py-3.5 font-financial text-text-secondary">{formatCurrency(asset.buy_price)}</td>
                        <td className="px-5 py-3.5 font-financial text-text-primary font-medium">{formatCurrency(asset.current_price)}</td>
                        <td className="px-5 py-3.5 font-financial text-text-primary">{formatCurrency(value)}</td>
                        <td className={cn('px-5 py-3.5 font-financial font-medium', pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          <br />
                          <span className="text-xs">{formatPercent(pnlPct)}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            <AssetActions asset={asset} />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-text-muted">
                        No assets in portfolio yet. {isAdmin && 'Add your first asset above.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
