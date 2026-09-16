import { useEffect, useState } from 'react'
import { BookingAPI } from '../api/endpoints.js'

const BADGE_CLASS = {
  confirmed: 'badge badge-confirmed',
  cancelled: 'badge badge-cancelled',
  completed: 'badge badge-completed',
  no_show: 'badge badge-no_show',
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  function refresh() {
    setLoading(true)
    BookingAPI.mine()
      .then(setBookings)
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  async function cancel(id) {
    const reason = window.prompt('Reason for cancellation (optional):') || undefined
    try {
      await BookingAPI.cancel(id, reason)
      refresh()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cancel booking')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My bookings</h1>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
          You have no bookings yet — go browse providers to get started.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => (
          <li key={b._id} className="card p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium truncate">{b.serviceId?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {b.slotId ? new Date(b.slotId.startTime).toLocaleString() : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={BADGE_CLASS[b.status] || 'badge badge-cancelled'}>{b.status}</span>
              {b.status === 'confirmed' && (
                <button onClick={() => cancel(b._id)} className="btn btn-danger !px-2 !py-1 text-sm">
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
