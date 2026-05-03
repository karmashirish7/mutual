'use client'

import { useState } from 'react'
import { PlusCircle, MinusCircle, RefreshCw } from 'lucide-react'
import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { recordDeposit, recordWithdrawal, updateFundValue } from '@/app/actions/fund'
import type { Profile } from '@/types'

interface Props {
  members: Profile[]
  currentFundValue: number
}

export function AdminActions({ members, currentFundValue }: Props) {
  const [modal, setModal] = useState<'deposit' | 'withdrawal' | 'update' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(action: (fd: FormData) => Promise<{ error?: string; success?: boolean }>, fd: FormData) {
    setLoading(true)
    setError('')
    const result = await action(fd)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setModal(null)
    }
  }

  const activeMembers = members.filter(m => m.is_active && m.role === 'member')

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="success" onClick={() => setModal('deposit')}>
          <PlusCircle className="w-3.5 h-3.5" /> Deposit
        </Button>
        <Button size="sm" variant="danger" onClick={() => setModal('withdrawal')}>
          <MinusCircle className="w-3.5 h-3.5" /> Withdraw
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setModal('update')}>
          <RefreshCw className="w-3.5 h-3.5" /> Update Value
        </Button>
      </div>

      {/* Deposit Modal */}
      <Modal open={modal === 'deposit'} onClose={() => { setModal(null); setError('') }} title="Record Deposit">
        <form
          action={(fd) => handleSubmit(recordDeposit, fd)}
          className="space-y-4"
        >
          <FormField label="Member" required>
            <Select name="member_id" required>
              <option value="">Select member…</option>
              {activeMembers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount (NPR)" required>
            <Input name="amount" type="number" min="1" step="0.01" placeholder="10000" required />
          </FormField>
          <FormField label="Notes">
            <Textarea name="notes" placeholder="Optional note…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" variant="success" size="sm" loading={loading}>Confirm Deposit</Button>
          </div>
        </form>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal open={modal === 'withdrawal'} onClose={() => { setModal(null); setError('') }} title="Record Withdrawal">
        <form
          action={(fd) => handleSubmit(recordWithdrawal, fd)}
          className="space-y-4"
        >
          <FormField label="Member" required>
            <Select name="member_id" required>
              <option value="">Select member…</option>
              {activeMembers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Units to Redeem" required>
            <Input name="units" type="number" min="0.0001" step="0.0001" placeholder="50.0000" required />
          </FormField>
          <FormField label="Notes">
            <Textarea name="notes" placeholder="Optional note…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" variant="danger" size="sm" loading={loading}>Confirm Withdrawal</Button>
          </div>
        </form>
      </Modal>

      {/* Update Fund Value Modal */}
      <Modal open={modal === 'update'} onClose={() => { setModal(null); setError('') }} title="Update Fund Value">
        <form
          action={(fd) => handleSubmit(updateFundValue, fd)}
          className="space-y-4"
        >
          <p className="text-xs text-text-secondary">
            Current fund value: <span className="font-financial text-text-primary font-semibold">
              NPR {currentFundValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>. Updating this will recalculate the NAV.
          </p>
          <FormField label="New Total Fund Value (NPR)" required>
            <Input
              name="total_fund_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={currentFundValue}
              required
            />
          </FormField>
          <FormField label="Notes">
            <Textarea name="notes" placeholder="Reason for update…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" size="sm" loading={loading}>Update Value</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
