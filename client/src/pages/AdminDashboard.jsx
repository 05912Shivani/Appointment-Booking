import { useEffect, useState } from 'react'
import { AdminAPI } from '../api/endpoints.js'

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [providers, setProviders] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function refresh() {
    AdminAPI.listProviders().then(setProviders)
    AdminAPI.analytics().then(setAnalytics)
    AdminAPI.auditLog().then(setAuditLog)
  }
  useEffect(refresh, [])

  async function toggleActive(provider) {
    await AdminAPI.setProviderActive(provider._id, !provider.isActive)
    refresh()
  }

  async function confirmDelete(provider) {
    setDeleting(true)
    setDeleteError('')
    try {
      await AdminAPI.deleteProvider(provider._id)
      setPendingDeleteId(null)
      refresh()
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Could not delete this provider')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>

      <section>
        <h2 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Analytics</h2>
        {analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total bookings" value={analytics.totalBookings} />
            <StatCard label="No-show rate" value={`${(analytics.noShowRate * 100).toFixed(1)}%`} />
            <StatCard label="Cancellation rate" value={`${(analytics.cancellationRate * 100).toFixed(1)}%`} />
            <StatCard label="Confirmed" value={analytics.statusCounts.confirmed || 0} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card h-20 animate-pulse" />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Providers</h2>
        <ul className="flex flex-col gap-2">
          {providers.map((p) => (
            <li key={p._id} className="card p-4 text-sm">
              <div className="flex justify-between items-center gap-4">
                <span className="min-w-0">
                  <span className="font-medium">{p.businessName}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">— {p.userId?.email}</span>
                  {!p.isActive && <span className="badge badge-cancelled ml-2">inactive</span>}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleActive(p)} className="btn btn-secondary !px-3 !py-1 text-xs">
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError('')
                      setPendingDeleteId(p._id)
                    }}
                    className="btn btn-danger !px-3 !py-1 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {pendingDeleteId === p._id && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <p className="text-slate-600 dark:text-slate-400">
                    Permanently delete <span className="font-medium">"{p.businessName}"</span>? This only works if
                    they have zero booking history — otherwise use Deactivate instead.
                  </p>
                  {deleteError && <p className="text-red-600 dark:text-red-400">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPendingDeleteId(null)
                        setDeleteError('')
                      }}
                      disabled={deleting}
                      className="btn btn-secondary !px-3 !py-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmDelete(p)}
                      disabled={deleting}
                      className="btn btn-danger !px-3 !py-1 text-xs"
                    >
                      {deleting ? 'Deleting...' : 'Yes, permanently delete'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {providers.length === 0 && (
            <div className="card p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No providers yet.</div>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-3 text-slate-700 dark:text-slate-300">Recent audit log</h2>
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {auditLog.map((log) => (
            <div key={log._id} className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 flex justify-between gap-4">
              <span>
                <span className="text-slate-400 dark:text-slate-500">{log.actorId?.email || 'system'}</span>{' '}
                — {log.action}
              </span>
              <span className="shrink-0 text-slate-400 dark:text-slate-500">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {auditLog.length === 0 && (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No activity yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}
