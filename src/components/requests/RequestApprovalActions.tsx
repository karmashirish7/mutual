'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, FormField, Textarea } from '@/components/ui/Modal'
import { approveRequest, rejectRequest } from '@/app/actions/requests'

interface Props {
  requestId: string
}

export function RequestApprovalActions({ requestId }: Props) {
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  async function handleApprove() {
    setLoading(true); setError('')
    const result = await approveRequest(requestId, adminNotes || undefined)
    setLoading(false)
    if (result.error) setError(result.error)
    else setModal(null)
  }

  async function handleReject() {
    setLoading(true); setError('')
    const result = await rejectRequest(requestId, adminNotes || undefined)
    setLoading(false)
    if (result.error) setError(result.error)
    else setModal(null)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="success" onClick={() => setModal('approve')}>
          <Check className="w-3 h-3" /> Approve
        </Button>
        <Button size="sm" variant="danger" onClick={() => setModal('reject')}>
          <X className="w-3 h-3" /> Reject
        </Button>
      </div>

      <Modal open={modal === 'approve'} onClose={() => { setModal(null); setError('') }} title="Approve Request">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Approving will execute the transaction at the current NAV and update the member's unit balance.
          </p>
          <FormField label="Admin Notes (optional)">
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Optional message to member…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="success" size="sm" loading={loading} onClick={handleApprove}>Approve & Execute</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'reject'} onClose={() => { setModal(null); setError('') }} title="Reject Request">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Provide a reason for rejection. The member will see this note.</p>
          <FormField label="Reason">
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Reason for rejection…" />
          </FormField>
          {error && <p className="text-xs text-loss">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={loading} onClick={handleReject}>Reject Request</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
