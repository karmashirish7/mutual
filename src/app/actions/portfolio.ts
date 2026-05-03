'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') throw new Error('Forbidden')
  return user
}

const assetSchema = z.object({
  asset_name: z.string().min(1),
  asset_type: z.enum(['stock', 'mutual_fund', 'other', 'cash']),
  symbol: z.string().optional(),
  quantity: z.number().min(0),
  buy_price: z.number().min(0),
  current_price: z.number().min(0),
  sector: z.string().optional(),
  notes: z.string().optional(),
})

export async function addAsset(formData: FormData) {
  const supabase = await createClient()

  try {
    const adminUser = await requireAdmin(supabase)

    const parsed = assetSchema.safeParse({
      asset_name: formData.get('asset_name'),
      asset_type: formData.get('asset_type'),
      symbol: formData.get('symbol') || undefined,
      quantity: parseFloat(formData.get('quantity') as string),
      buy_price: parseFloat(formData.get('buy_price') as string),
      current_price: parseFloat(formData.get('current_price') as string),
      sector: formData.get('sector') || undefined,
      notes: formData.get('notes') || undefined,
    })

    if (!parsed.success) return { error: parsed.error.errors[0].message }

    const { data: asset, error } = await supabase
      .from('portfolio_assets')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { error: error.message }

    const totalValue = parsed.data.quantity * parsed.data.current_price
    const totalCost = parsed.data.quantity * parsed.data.buy_price

    // Update fund stats: add asset value, reduce cash
    const { data: stats } = await supabase
      .from('fund_stats').select('*').eq('id', 1).single()

    if (stats) {
      await supabase.from('fund_stats').update({
        total_fund_value: stats.total_fund_value + totalValue - totalCost,
        cash_balance: Math.max(0, stats.cash_balance - totalCost),
      }).eq('id', 1)
    }

    await supabase.from('transactions').insert({
      transaction_type: 'asset_buy',
      amount: totalCost,
      asset_id: asset.id,
      asset_name: parsed.data.asset_name,
      units: parsed.data.quantity,
      nav_at_transaction: stats?.nav,
      notes: `Bought ${parsed.data.quantity} × ${parsed.data.asset_name} @ ${parsed.data.buy_price}`,
      performed_by: adminUser.id,
    })

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function updateAsset(assetId: string, formData: FormData) {
  const supabase = await createClient()

  try {
    await requireAdmin(supabase)

    const newPrice = parseFloat(formData.get('current_price') as string)
    const newQuantity = formData.get('quantity') ? parseFloat(formData.get('quantity') as string) : undefined

    const updates: Record<string, unknown> = {}
    if (!isNaN(newPrice)) updates.current_price = newPrice
    if (newQuantity !== undefined && !isNaN(newQuantity)) updates.quantity = newQuantity
    if (formData.get('notes')) updates.notes = formData.get('notes')

    const { data: oldAsset } = await supabase
      .from('portfolio_assets').select('*').eq('id', assetId).single()

    const { error } = await supabase
      .from('portfolio_assets').update(updates).eq('id', assetId)

    if (error) return { error: error.message }

    // Recalculate fund total value
    if (!isNaN(newPrice) && oldAsset) {
      const { data: stats } = await supabase
        .from('fund_stats').select('*').eq('id', 1).single()

      if (stats) {
        const oldValue = oldAsset.quantity * oldAsset.current_price
        const newValue = (newQuantity ?? oldAsset.quantity) * newPrice
        const diff = newValue - oldValue

        await supabase.from('fund_stats').update({
          total_fund_value: stats.total_fund_value + diff,
        }).eq('id', 1)
      }
    }

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function sellAsset(assetId: string, formData: FormData) {
  const supabase = await createClient()

  try {
    const adminUser = await requireAdmin(supabase)

    const quantityToSell = parseFloat(formData.get('quantity') as string)
    const sellPrice = parseFloat(formData.get('sell_price') as string)
    const notes = formData.get('notes') as string

    const { data: asset } = await supabase
      .from('portfolio_assets').select('*').eq('id', assetId).single()

    if (!asset) return { error: 'Asset not found' }
    if (quantityToSell > asset.quantity) return { error: 'Insufficient quantity' }

    const saleProceeds = quantityToSell * sellPrice
    const newQuantity = asset.quantity - quantityToSell

    await supabase.from('portfolio_assets').update({
      quantity: newQuantity,
      current_price: sellPrice,
      is_active: newQuantity > 0,
    }).eq('id', assetId)

    const { data: stats } = await supabase
      .from('fund_stats').select('*').eq('id', 1).single()

    if (stats) {
      const oldValue = quantityToSell * asset.current_price
      const diff = saleProceeds - oldValue

      await supabase.from('fund_stats').update({
        total_fund_value: stats.total_fund_value + diff,
        cash_balance: stats.cash_balance + saleProceeds,
      }).eq('id', 1)
    }

    await supabase.from('transactions').insert({
      transaction_type: 'asset_sell',
      amount: saleProceeds,
      asset_id: assetId,
      asset_name: asset.asset_name,
      units: quantityToSell,
      nav_at_transaction: stats?.nav,
      notes: notes || `Sold ${quantityToSell} × ${asset.asset_name} @ ${sellPrice}`,
      performed_by: adminUser.id,
    })

    revalidatePath('/portfolio')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
