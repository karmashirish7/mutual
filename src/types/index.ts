export type Role = 'super_admin' | 'member'
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'unit_issue'
  | 'unit_redemption'
  | 'asset_buy'
  | 'asset_sell'
  | 'nav_update'
  | 'price_update'
export type AssetType = 'stock' | 'mutual_fund' | 'other' | 'cash'
export type RequestType = 'buy_units' | 'sell_units'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  phone?: string
  joined_date: string
  is_active: boolean
  agreed_to_disclaimer: boolean
  created_at: string
  updated_at: string
}

export interface FundStats {
  id: number
  total_fund_value: number
  total_units: number
  nav: number
  cash_balance: number
  last_updated: string
}

export interface UnitLedger {
  id: string
  member_id: string
  units: number
  total_invested: number
  total_withdrawn: number
  avg_nav_at_purchase: number
  updated_at: string
  member?: Profile
}

export interface PortfolioAsset {
  id: string
  asset_name: string
  asset_type: AssetType
  symbol?: string
  quantity: number
  buy_price: number
  current_price: number
  sector?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  total_value?: number
  gain_loss?: number
  gain_loss_pct?: number
}

export interface Transaction {
  id: string
  transaction_type: TransactionType
  member_id?: string
  amount?: number
  units?: number
  nav_at_transaction?: number
  asset_id?: string
  asset_name?: string
  notes?: string
  performed_by?: string
  created_at: string
  member?: Profile
  performer?: Profile
}

export interface Request {
  id: string
  member_id: string
  request_type: RequestType
  amount?: number
  units?: number
  status: RequestStatus
  notes?: string
  admin_notes?: string
  processed_by?: string
  processed_at?: string
  created_at: string
  member?: Profile
}

export interface MemberPortfolio {
  profile: Profile
  ledger: UnitLedger | null
  current_value: number
  profit_loss: number
  profit_loss_pct: number
  ownership_pct: number
}
