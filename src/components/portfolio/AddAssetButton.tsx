'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal'
import { addAsset } from '@/app/actions/portfolio'

export function AddAssetButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    setLoading(true)
    setError('')
    const result = await addAsset(fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else setOpen(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="w-3.5 h-3.5" /> Add Asset
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setError('') }} title="Add Portfolio Asset">
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Asset Name" required>
              <Input name="asset_name" placeholder="e.g. Nabil Bank" required />
            </FormField>
            <FormField label="Symbol">
              <Input name="symbol" placeholder="e.g. NABIL" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Asset Type" required>
              <Select name="asset_type" required>
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
                <option value="other">Other</option>
                <option value="cash">Cash</option>
              </Select>
            </FormField>
            <FormField label="Sector">
              <Input name="sector" placeholder="e.g. Banking" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Quantity" required>
              <Input name="quantity" type="number" min="0" step="0.0001" placeholder="100" required />
            </FormField>
            <FormField label="Buy Price" required>
              <Input name="buy_price" type="number" min="0" step="0.01" placeholder="1200.00" required />
            </FormField>
            <FormField label="Current Price" required>
              <Input name="current_price" type="number" min="0" step="0.01" placeholder="1350.00" required />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea name="notes" placeholder="Optional notes…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={loading}>Add Asset</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
