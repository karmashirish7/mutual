'use client'

import { useState } from 'react'
import { Edit2, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, FormField, Input, Textarea } from '@/components/ui/Modal'
import { updateAsset, sellAsset } from '@/app/actions/portfolio'
import type { PortfolioAsset } from '@/types'

interface Props {
  asset: PortfolioAsset
}

export function AssetActions({ asset }: Props) {
  const [modal, setModal] = useState<'edit' | 'sell' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEdit(fd: FormData) {
    setLoading(true); setError('')
    const result = await updateAsset(asset.id, fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else setModal(null)
  }

  async function handleSell(fd: FormData) {
    setLoading(true); setError('')
    const result = await sellAsset(asset.id, fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else setModal(null)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => setModal('edit')}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="danger" onClick={() => setModal('sell')}>
          <TrendingDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Edit Price Modal */}
      <Modal open={modal === 'edit'} onClose={() => { setModal(null); setError('') }} title={`Update: ${asset.asset_name}`}>
        <form action={handleEdit} className="space-y-4">
          <FormField label="Current Price">
            <Input name="current_price" type="number" min="0" step="0.01" defaultValue={asset.current_price} />
          </FormField>
          <FormField label="Quantity">
            <Input name="quantity" type="number" min="0" step="0.0001" defaultValue={asset.quantity} />
          </FormField>
          <FormField label="Notes">
            <Input name="notes" defaultValue={asset.notes ?? ''} />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" size="sm" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Sell Modal */}
      <Modal open={modal === 'sell'} onClose={() => { setModal(null); setError('') }} title={`Sell: ${asset.asset_name}`}>
        <form action={handleSell} className="space-y-4">
          <p className="text-xs text-text-secondary">
            Available: <span className="font-financial font-semibold text-text-primary">{asset.quantity}</span> units
          </p>
          <FormField label="Quantity to Sell" required>
            <Input name="quantity" type="number" min="0.0001" max={asset.quantity} step="0.0001" required />
          </FormField>
          <FormField label="Sell Price" required>
            <Input name="sell_price" type="number" min="0" step="0.01" defaultValue={asset.current_price} required />
          </FormField>
          <FormField label="Notes">
            <Textarea name="notes" placeholder="Optional reason…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" variant="danger" size="sm" loading={loading}>Confirm Sale</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
