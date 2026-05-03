'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal'
import { submitRequest } from '@/app/actions/requests'
import { formatNumber } from '@/lib/utils'

interface Props {
  myUnits: number
}

export function SubmitRequestButton({ myUnits }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<'buy_units' | 'sell_units'>('buy_units')

  async function handleSubmit(fd: FormData) {
    setLoading(true); setError('')
    const result = await submitRequest(fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else setOpen(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="w-3.5 h-3.5" /> New Request
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setError('') }} title="Submit Investment Request">
        <form action={handleSubmit} className="space-y-4">
          <FormField label="Request Type" required>
            <Select
              name="request_type"
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              required
            >
              <option value="buy_units">Invest More (Buy Units)</option>
              <option value="sell_units">Withdraw (Sell Units)</option>
            </Select>
          </FormField>

          {type === 'buy_units' && (
            <FormField label="Amount to Invest (NPR)" required>
              <Input name="amount" type="number" min="1" step="0.01" placeholder="10000" required />
            </FormField>
          )}

          {type === 'sell_units' && (
            <>
              <p className="text-xs text-text-secondary bg-surface-elevated rounded-lg px-3 py-2">
                You currently hold <span className="font-financial font-semibold text-text-primary">{formatNumber(myUnits, 4)}</span> units.
              </p>
              <FormField label="Units to Sell" required>
                <Input name="units" type="number" min="0.0001" max={myUnits} step="0.0001" required />
              </FormField>
            </>
          )}

          <FormField label="Notes">
            <Textarea name="notes" placeholder="Any message for the admin…" />
          </FormField>

          <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 text-xs text-text-secondary">
            Your request will be reviewed and processed by the admin. Units will be issued/redeemed at the NAV at time of approval.
          </div>

          {error && <p className="text-xs text-loss">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={loading}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
