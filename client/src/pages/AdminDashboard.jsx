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

  async function deleteProvider(provider) {
    const confirmed = window.confirm(
      `Permanently delete "${provider.businessName}"? This only works if they have no booking history — otherwise use Deactivate.`,
    )
    if (!confirmed) return
    try {
      await AdminAPI.deleteProvider(provider._id)
      refresh()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete this provider')
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
            <li key={p._id} className="card p-4 flex justify-between items-center text-sm">
              <span>
                <span className="font-medium">{p.businessName}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">— {p.userId?.email}</span>
                {!p.isActive && <span className="badge badge-cancelled ml-2">inactive</span>}
              </span>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(p)} className="btn btn-secondary !px-3 !py-1 text-xs">
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteProvider(p)} className="btn btn-danger !px-3 !py-1 text-xs">
                  Delete
                </button>
              </div>
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
