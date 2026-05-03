'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function submitRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const requestType = formData.get('request_type') as 'buy_units' | 'sell_units'
  const amount = formData.get('amount') ? parseFloat(formData.get('amount') as string) : undefined
  const units = formData.get('units') ? parseFloat(formData.get('units') as string) : undefined
  const notes = formData.get('notes') as string

  if (requestType === 'buy_units' && (!amount || amount <= 0)) {
    return { error: 'Amount is required for buy requests' }
  }
  if (requestType === 'sell_units' && (!units || units <= 0)) {
    return { error: 'Units are required for sell requests' }
  }

  const { error } = await supabase.from('requests').insert({
    member_id: user.id,
    request_type: requestType,
    amount,
    units,
    notes,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/requests')
  return { success: true }
}

export async function approveRequest(requestId: string, adminNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (adminProfile?.role !== 'super_admin') return { error: 'Forbidden' }

  const { data: req } = await supabase
    .from('requests').select('*').eq('id', requestId).single()

  if (!req) return { error: 'Request not found' }
  if (req.status !== 'pending') return { error: 'Request already processed' }

  // Perform the actual transaction based on request type
  const { data: stats } = await supabase
    .from('fund_stats').select('*').eq('id', 1).single()

  if (!stats) return { error: 'Fund stats not found' }

  const currentNav = stats.nav

  if (req.request_type === 'buy_units' && req.amount) {
    const unitsToIssue = req.amount / currentNav

    const { data: ledger } = await supabase
      .from('unit_ledger').select('*').eq('member_id', req.member_id).single()

    if (ledger) {
      const totalUnits = ledger.units + unitsToIssue
      const totalInvested = ledger.total_invested + req.amount
      await supabase.from('unit_ledger').update({
        units: totalUnits,
        total_invested: totalInvested,
        avg_nav_at_purchase: totalInvested / totalUnits,
      }).eq('member_id', req.member_id)
    } else {
      await supabase.from('unit_ledger').insert({
        member_id: req.member_id,
        units: unitsToIssue,
        total_invested: req.amount,
        avg_nav_at_purchase: currentNav,
      })
    }

    await supabase.from('fund_stats').update({
      total_units: stats.total_units + unitsToIssue,
      total_fund_value: stats.total_fund_value + req.amount,
      cash_balance: stats.cash_balance + req.amount,
    }).eq('id', 1)

    await supabase.from('transactions').insert([
      {
        transaction_type: 'deposit',
        member_id: req.member_id,
        amount: req.amount,
        units: unitsToIssue,
        nav_at_transaction: currentNav,
        notes: `Approved buy request #${requestId.slice(0, 8)}`,
        performed_by: user.id,
      },
      {
        transaction_type: 'unit_issue',
        member_id: req.member_id,
        amount: req.amount,
        units: unitsToIssue,
        nav_at_transaction: currentNav,
        notes: `Issued ${unitsToIssue.toFixed(4)} units @ NAV ${currentNav.toFixed(4)}`,
        performed_by: user.id,
      },
    ])
  } else if (req.request_type === 'sell_units' && req.units) {
    const { data: ledger } = await supabase
      .from('unit_ledger').select('*').eq('member_id', req.member_id).single()

    if (!ledger || ledger.units < req.units) {
      return { error: 'Member has insufficient units' }
    }

    const withdrawalAmount = req.units * currentNav
    const remainingUnits = ledger.units - req.units

    await supabase.from('unit_ledger').update({
      units: remainingUnits,
      total_withdrawn: ledger.total_withdrawn + withdrawalAmount,
    }).eq('member_id', req.member_id)

    await supabase.from('fund_stats').update({
      total_units: Math.max(0, stats.total_units - req.units),
      total_fund_value: Math.max(0, stats.total_fund_value - withdrawalAmount),
      cash_balance: Math.max(0, stats.cash_balance - withdrawalAmount),
    }).eq('id', 1)

    await supabase.from('transactions').insert([
      {
        transaction_type: 'withdrawal',
        member_id: req.member_id,
        amount: withdrawalAmount,
        units: req.units,
        nav_at_transaction: currentNav,
        notes: `Approved sell request #${requestId.slice(0, 8)}`,
        performed_by: user.id,
      },
      {
        transaction_type: 'unit_redemption',
        member_id: req.member_id,
        amount: withdrawalAmount,
        units: req.units,
        nav_at_transaction: currentNav,
        notes: `Redeemed ${req.units.toFixed(4)} units @ NAV ${currentNav.toFixed(4)}`,
        performed_by: user.id,
      },
    ])
  }

  // Mark request as approved
  await supabase.from('requests').update({
    status: 'approved',
    admin_notes: adminNotes ?? null,
    processed_by: user.id,
    processed_at: new Date().toISOString(),
  }).eq('id', requestId)

  revalidatePath('/requests')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  return { success: true }
}

export async function rejectRequest(requestId: string, adminNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (adminProfile?.role !== 'super_admin') return { error: 'Forbidden' }

  const { error } = await supabase.from('requests').update({
    status: 'rejected',
    admin_notes: adminNotes ?? null,
    processed_by: user.id,
    processed_at: new Date().toISOString(),
  }).eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/requests')
  return { success: true }
}
