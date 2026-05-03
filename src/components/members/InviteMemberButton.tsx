'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, FormField, Input } from '@/components/ui/Modal'
import { inviteMember } from '@/app/actions/auth'
import { AlertTriangle } from 'lucide-react'

export function InviteMemberButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(fd: FormData) {
    setLoading(true); setError('')
    const result = await inviteMember(fd)
    setLoading(false)
    if (result.error) setError(result.error)
    else { setSuccess(true); setTimeout(() => { setSuccess(false); setOpen(false) }, 2000) }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="w-3.5 h-3.5" /> Invite Member
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); setError(''); setSuccess(false) }} title="Invite New Member">
        {success ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-profit/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-profit font-medium">Member invited successfully!</p>
            <p className="text-xs text-text-muted mt-1">They can now log in with the provided credentials.</p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">
                This creates a login account for the member. Share the password with them securely.
                Only invite people who have agreed to the group's investment disclaimer.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Full Name" required>
                <Input name="full_name" placeholder="Ramesh Shrestha" required />
              </FormField>
              <FormField label="Phone">
                <Input name="phone" placeholder="+977 98XXXXXXXX" />
              </FormField>
            </div>
            <FormField label="Email Address" required>
              <Input name="email" type="email" placeholder="ramesh@example.com" required />
            </FormField>
            <FormField label="Initial Password" required>
              <Input name="password" type="password" placeholder="Min. 8 characters" minLength={8} required />
            </FormField>
            {error && <p className="text-xs text-loss">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" loading={loading}>Create Account</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
