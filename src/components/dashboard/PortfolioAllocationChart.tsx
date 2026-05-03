'use client'

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatCurrency } from '@/lib/utils'
import type { PortfolioAsset } from '@/types'

interface Props {
  assets: PortfolioAsset[]
  cashBalance: number
}

export function PortfolioAllocationChart({ assets, cashBalance }: Props) {
  const grouped: Record<string, number> = { cash: cashBalance }

  for (const asset of assets) {
    if (!asset.is_active) continue
    const type = asset.asset_type
    const value = asset.quantity * asset.current_price
    grouped[type] = (grouped[type] || 0) + value
  }

  const data = Object.entries(grouped)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: ASSET_TYPE_LABELS[type] ?? type,
      value,
      color: ASSET_TYPE_COLORS[type] ?? '#6366f1',
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No assets in portfolio yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1d26',
            border: '1px solid #242730',
            borderRadius: '12px',
            color: '#f1f5f9',
            fontSize: '12px',
          }}
          formatter={(value: number) => [formatCurrency(value), 'Value']}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
