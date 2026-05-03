import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { SubmitRequestButton } from '@/components/requests/SubmitRequestButton'
import { RequestApprovalActions } from '@/components/requests/RequestApprovalActions'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import type { Profile, Request } from '@/types'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, ledgerRes, requestsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('unit_ledger').select('units').eq('member_id', user.id).single(),
    supabase
      .from('requests')
      .select(`*, member:member_id ( full_name, email )`)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data as Profile
  const myUnits = ledgerRes.data?.units ?? 0
  const isAdmin = profile.role === 'super_admin'

  const allRequests = (requestsRes.data ?? []) as Request[]
  const visibleRequests = isAdmin
    ? allRequests
    : allRequests.filter(r => r.member_id === user.id)

  const pending = visibleRequests.filter(r => r.status === 'pending')
  const processed = visibleRequests.filter(r => r.status !== 'pending')

  return (
    <div>
      <TopBar
        title="Requests"
        subtitle={isAdmin ? `${pending.length} pending approval` : 'Submit and track your investment requests'}
        actions={!isAdmin ? <SubmitRequestButton myUnits={myUnits} /> : undefined}
      />

      <div className="p-6 space-y-6">
        {/* Pending */}
        {pending.length > 0 && (
          <Card>
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                Pending Requests
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-warning/10 text-warning border border-warning/20">{pending.length}</span>
              </h3>
            </div>
            <CardContent className="px-0 py-0">
              <RequestTable requests={pending} isAdmin={isAdmin} showActions />
            </CardContent>
          </Card>
        )}

        {/* Processed */}
        <Card>
          <div className="px-5 py-4 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-text-primary">Request History</h3>
          </div>
          <CardContent className="px-0 py-0">
            <RequestTable requests={processed} isAdmin={isAdmin} showActions={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RequestTable({
  requests,
  isAdmin,
  showActions,
}: {
  requests: Request[]
  isAdmin: boolean
  showActions: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border">
            {isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Member</th>}
            <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Amount / Units</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Notes</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
            {showActions && isAdmin && <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {requests.map(req => (
            <tr key={req.id} className="hover:bg-surface-elevated/40 transition-colors">
              {isAdmin && (
                <td className="px-5 py-3.5">
                  <p className="font-medium text-text-primary">
                    {(req.member as unknown as { full_name: string })?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {(req.member as unknown as { email: string })?.email ?? ''}
                  </p>
                </td>
              )}
              <td className="px-5 py-3.5">
                <span className={`font-medium ${req.request_type === 'buy_units' ? 'text-profit' : 'text-loss'}`}>
                  {req.request_type === 'buy_units' ? '↑ Buy Units' : '↓ Sell Units'}
                </span>
              </td>
              <td className="px-5 py-3.5 font-financial">
                {req.amount != null && (
                  <p className="text-text-primary font-medium">{formatCurrency(req.amount)}</p>
                )}
                {req.units != null && (
                  <p className="text-text-secondary text-xs">{formatNumber(req.units, 4)} units</p>
                )}
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={req.status} />
              </td>
              <td className="px-5 py-3.5 text-text-muted max-w-[160px]">
                <p className="truncate" title={req.notes ?? ''}>{req.notes || '—'}</p>
                {req.admin_notes && (
                  <p className="text-xs text-warning truncate" title={req.admin_notes}>Admin: {req.admin_notes}</p>
                )}
              </td>
              <td className="px-5 py-3.5 text-text-muted text-xs whitespace-nowrap">
                {formatDate(req.created_at)}
              </td>
              {showActions && isAdmin && (
                <td className="px-5 py-3.5">
                  <RequestApprovalActions requestId={req.id} />
                </td>
              )}
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-text-muted">No requests found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
