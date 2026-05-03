-- ============================================================
-- Friends Investment Pool (FIP) — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('super_admin', 'member')),
  phone         TEXT,
  joined_date   TIMESTAMPTZ DEFAULT NOW(),
  is_active     BOOLEAN DEFAULT TRUE,
  agreed_to_disclaimer BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUND STATS (single-row table — the fund's live state)
-- ============================================================
CREATE TABLE IF NOT EXISTS fund_stats (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  total_fund_value   NUMERIC(18,2) DEFAULT 0,
  total_units        NUMERIC(18,6) DEFAULT 0,
  nav                NUMERIC(18,6) DEFAULT 100,
  cash_balance       NUMERIC(18,2) DEFAULT 0,
  last_updated       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single row
INSERT INTO fund_stats (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- UNIT LEDGER (units owned per member)
-- ============================================================
CREATE TABLE IF NOT EXISTS unit_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id            UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  units                NUMERIC(18,6) DEFAULT 0,
  total_invested       NUMERIC(18,2) DEFAULT 0,
  total_withdrawn      NUMERIC(18,2) DEFAULT 0,
  avg_nav_at_purchase  NUMERIC(18,6) DEFAULT 100,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PORTFOLIO ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name    TEXT NOT NULL,
  asset_type    TEXT NOT NULL
                  CHECK (asset_type IN ('stock', 'mutual_fund', 'other', 'cash')),
  symbol        TEXT,
  quantity      NUMERIC(18,6) DEFAULT 0,
  buy_price     NUMERIC(18,6) DEFAULT 0,
  current_price NUMERIC(18,6) DEFAULT 0,
  sector        TEXT,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS (immutable audit log — no UPDATE/DELETE)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type     TEXT NOT NULL
                         CHECK (transaction_type IN (
                           'deposit', 'withdrawal',
                           'unit_issue', 'unit_redemption',
                           'asset_buy', 'asset_sell',
                           'nav_update', 'price_update'
                         )),
  member_id            UUID REFERENCES profiles(id),
  amount               NUMERIC(18,2),
  units                NUMERIC(18,6),
  nav_at_transaction   NUMERIC(18,6),
  asset_id             UUID REFERENCES portfolio_assets(id),
  asset_name           TEXT,
  notes                TEXT,
  performed_by         UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REQUESTS (member buy/sell requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_type   TEXT NOT NULL CHECK (request_type IN ('buy_units', 'sell_units')),
  amount         NUMERIC(18,2),
  units          NUMERIC(18,6),
  status         TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  notes          TEXT,
  admin_notes    TEXT,
  processed_by   UUID REFERENCES profiles(id),
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS  (drop first so this file is safely re-runnable)
-- ============================================================

DROP TRIGGER IF EXISTS profiles_updated_at        ON profiles;
DROP TRIGGER IF EXISTS unit_ledger_updated_at      ON unit_ledger;
DROP TRIGGER IF EXISTS portfolio_assets_updated_at ON portfolio_assets;
DROP TRIGGER IF EXISTS fund_stats_nav_recalc       ON fund_stats;
DROP TRIGGER IF EXISTS on_auth_user_created        ON auth.users;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER unit_ledger_updated_at
  BEFORE UPDATE ON unit_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER portfolio_assets_updated_at
  BEFORE UPDATE ON portfolio_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-recalculate NAV when fund_stats changes
CREATE OR REPLACE FUNCTION recalculate_nav()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_units > 0 THEN
    NEW.nav = NEW.total_fund_value / NEW.total_units;
  ELSE
    NEW.nav = 100;
  END IF;
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fund_stats_nav_recalc
  BEFORE UPDATE ON fund_stats
  FOR EACH ROW EXECUTE FUNCTION recalculate_nav();

-- Auto-create profile on new auth user signup
-- SET LOCAL row_security = off lets the trigger insert even before any admin exists
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_stats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_ledger     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests        ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a super_admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all policies before recreating (makes this file re-runnable)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','fund_stats','unit_ledger','portfolio_assets','transactions','requests')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- profiles
CREATE POLICY "profiles: members read own, admins read all"
  ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles: admins or own insert"
  ON profiles FOR INSERT WITH CHECK (is_admin() OR auth.uid() IS NOT NULL);

CREATE POLICY "profiles: admins update"
  ON profiles FOR UPDATE USING (is_admin());

-- fund_stats
CREATE POLICY "fund_stats: all authenticated can read"
  ON fund_stats FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fund_stats: admins can update"
  ON fund_stats FOR UPDATE USING (is_admin());

-- unit_ledger
CREATE POLICY "unit_ledger: members read own, admins read all"
  ON unit_ledger FOR SELECT USING (member_id = auth.uid() OR is_admin());

CREATE POLICY "unit_ledger: admins insert"
  ON unit_ledger FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "unit_ledger: admins update"
  ON unit_ledger FOR UPDATE USING (is_admin());

-- portfolio_assets
CREATE POLICY "portfolio_assets: all authenticated can read"
  ON portfolio_assets FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "portfolio_assets: admins insert"
  ON portfolio_assets FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "portfolio_assets: admins update"
  ON portfolio_assets FOR UPDATE USING (is_admin());

CREATE POLICY "portfolio_assets: admins delete"
  ON portfolio_assets FOR DELETE USING (is_admin());

-- transactions (immutable — no update/delete policies granted)
CREATE POLICY "transactions: all authenticated can read"
  ON transactions FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "transactions: admins insert"
  ON transactions FOR INSERT WITH CHECK (is_admin());

-- requests
CREATE POLICY "requests: members read own, admins read all"
  ON requests FOR SELECT USING (member_id = auth.uid() OR is_admin());

CREATE POLICY "requests: members insert own"
  ON requests FOR INSERT WITH CHECK (member_id = auth.uid());

CREATE POLICY "requests: admins update (approve/reject)"
  ON requests FOR UPDATE USING (is_admin());

-- ============================================================
-- INDEXES (IF NOT EXISTS makes these re-runnable too)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_member    ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created   ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unit_ledger_member     ON unit_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_requests_member        ON requests(member_id);
CREATE INDEX IF NOT EXISTS idx_requests_status        ON requests(status);
