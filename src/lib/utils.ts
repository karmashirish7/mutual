import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'NPR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals = 4): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export const TRANSACTION_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  unit_issue: 'Units Issued',
  unit_redemption: 'Units Redeemed',
  asset_buy: 'Asset Purchase',
  asset_sell: 'Asset Sale',
  nav_update: 'NAV Update',
  price_update: 'Price Update',
}

export const TRANSACTION_COLORS: Record<string, string> = {
  deposit: 'text-profit',
  withdrawal: 'text-loss',
  unit_issue: 'text-primary',
  unit_redemption: 'text-warning',
  asset_buy: 'text-blue-400',
  asset_sell: 'text-purple-400',
  nav_update: 'text-text-secondary',
  price_update: 'text-text-secondary',
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: 'Stock',
  mutual_fund: 'Mutual Fund',
  other: 'Other',
  cash: 'Cash',
}

export const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: '#6366f1',
  mutual_fund: '#10b981',
  other: '#f59e0b',
  cash: '#94a3b8',
}
