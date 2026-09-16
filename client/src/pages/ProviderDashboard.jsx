import { useEffect, useState } from 'react'
import { ProviderAPI } from '../api/endpoints.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BADGE_CLASS = {
  confirmed: 'badge badge-confirmed',
  cancelled: 'badge badge-cancelled',
  completed: 'badge badge-completed',
  no_show: 'badge badge-no_show',
}

function ProfileSection() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ProviderAPI.getMe().then(setProfile)
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const updated = await ProviderAPI.updateMe({
        businessName: profile.businessName,
        bio: profile.bio,
        timezone: profile.timezone,
        bufferMinutes: Number(profile.bufferMinutes),
        minCancelNoticeHours: Number(profile.minCancelNoticeHours),
      })
      setProfile(updated)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div className="card h-64 animate-pulse" />

  return (
    <form onSubmit={save} className="card p-6 flex flex-col gap-4 max-w-lg">
      <div>
        <label className="field-label">Business name</label>
        <input
          className="field"
          value={profile.businessName}
          onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">Bio</label>
        <textarea
          className="field"
          rows={3}
          value={profile.bio || ''}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          placeholder="Tell customers a bit about your practice"
        />
      </div>
      <div>
        <label className="field-label">Timezone (IANA, e.g. Asia/Kolkata)</label>
        <input
          className="field"
          value={profile.timezone}
          onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Buffer between appts (min)</label>
          <input
            type="number"
            min="0"
            className="field"
            value={profile.bufferMinutes}
            onChange={(e) => setProfile({ ...profile, bufferMinutes: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Min. cancel notice (hrs)</label>
          <input
            type="number"
            min="0"
            className="field"
            value={profile.minCancelNoticeHours}
            onChange={(e) => setProfile({ ...profile, minCancelNoticeHours: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <button disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
      </div>
    </form>
  )
}

function ServicesSection() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState({ name: '', durationMinutes: 30, price: 0 })

  function refresh() {
    ProviderAPI.listServices().then(setServices)
  }
  useEffect(refresh, [])

  async function addService(e) {
    e.preventDefault()
    await ProviderAPI.createService({
      name: form.name,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
    })
    setForm({ name: '', durationMinutes: 30, price: 0 })
    refresh()
  }

  async function deactivate(id) {
    await ProviderAPI.deactivateService(id)
    refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {services.map((s) => (
          <li key={s._id} className="card p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {s.durationMinutes} min · ${s.price} {!s.isActive && '· inactive'}
              </p>
            </div>
            {s.isActive && (
              <button onClick={() => deactivate(s._id)} className="btn btn-danger !px-2 !py-1 text-sm">
                Deactivate
              </button>
            )}
          </li>
        ))}
        {services.length === 0 && (
          <div className="card p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No services yet.</div>
        )}
      </ul>
      <form onSubmit={addService} className="card p-4 flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="field-label">Service name</label>
          <input
            required
            className="field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="w-28">
          <label className="field-label">Duration (min)</label>
          <input
            type="number"
            min="5"
            className="field"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />
        </div>
        <div className="w-24">
          <label className="field-label">Price</label>
          <input
            type="number"
            min="0"
            className="field"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <button className="btn btn-primary">Add service</button>
      </form>
    </div>
  )
}

function AvailabilitySection() {
  const [rules, setRules] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [rule, setRule] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })
  const [exception, setException] = useState({ date: '', type: 'blackout', startTime: '', endTime: '' })

  function refresh() {
    ProviderAPI.listRules().then(setRules)
    ProviderAPI.listExceptions().then(setExceptions)
  }
  useEffect(refresh, [])

  async function addRule(e) {
    e.preventDefault()
    await ProviderAPI.createRule({ ...rule, dayOfWeek: Number(rule.dayOfWeek) })
    refresh()
  }

  async function removeRule(id) {
    await ProviderAPI.deleteRule(id)
    refresh()
  }

  async function addException(e) {
    e.preventDefault()
    await ProviderAPI.createException(exception)
    setException({ date: '', type: 'blackout', startTime: '', endTime: '' })
    refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h3 className="font-medium mb-3">Recurring weekly hours</h3>
        <ul className="flex flex-col gap-1 mb-4 text-sm">
          {rules.map((r) => (
            <li key={r._id} className="flex gap-3 items-center justify-between rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
              <span>
                <span className="font-medium">{DAYS[r.dayOfWeek]}</span> · {r.startTime}–{r.endTime}
              </span>
              <button onClick={() => removeRule(r._id)} className="btn btn-danger !px-2 !py-1 text-xs">
                Remove
              </button>
            </li>
          ))}
          {rules.length === 0 && <p className="text-slate-500 dark:text-slate-400">No recurring hours set yet.</p>}
        </ul>
        <form onSubmit={addRule} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="field-label">Day</label>
            <select
              className="field"
              value={rule.dayOfWeek}
              onChange={(e) => setRule({ ...rule, dayOfWeek: e.target.value })}
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Start</label>
            <input
              type="time"
              className="field"
              value={rule.startTime}
              onChange={(e) => setRule({ ...rule, startTime: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">End</label>
            <input
              type="time"
              className="field"
              value={rule.endTime}
              onChange={(e) => setRule({ ...rule, endTime: e.target.value })}
            />
          </div>
          <button className="btn btn-primary">Add rule</button>
        </form>
      </div>

      <div className="card p-4">
        <h3 className="font-medium mb-3">Exceptions (holidays / extra hours)</h3>
        <ul className="flex flex-col gap-1 mb-4 text-sm">
          {exceptions.map((ex) => (
            <li key={ex._id} className="rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
              {ex.date} — {ex.type}
              {ex.type === 'extra' && ` (${ex.startTime}–${ex.endTime})`}
            </li>
          ))}
          {exceptions.length === 0 && <p className="text-slate-500 dark:text-slate-400">No exceptions set.</p>}
        </ul>
        <form onSubmit={addException} className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              required
              className="field"
              value={exception.date}
              onChange={(e) => setException({ ...exception, date: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Type</label>
            <select
              className="field"
              value={exception.type}
              onChange={(e) => setException({ ...exception, type: e.target.value })}
            >
              <option value="blackout">Blackout (day off)</option>
              <option value="extra">Extra hours</option>
            </select>
          </div>
          {exception.type === 'extra' && (
            <>
              <div>
                <label className="field-label">Start</label>
                <input
                  type="time"
                  className="field"
                  value={exception.startTime}
                  onChange={(e) => setException({ ...exception, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">End</label>
                <input
                  type="time"
                  className="field"
                  value={exception.endTime}
                  onChange={(e) => setException({ ...exception, endTime: e.target.value })}
                />
              </div>
            </>
          )}
          <button className="btn btn-primary">Add exception</button>
        </form>
      </div>
    </div>
  )
}

function BookingsSection() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  function refresh() {
    ProviderAPI.bookings()
      .then(setBookings)
      .finally(() => setLoading(false))
  }
  useEffect(refresh, [])

  async function complete(id) {
    await ProviderAPI.completeBooking(id)
    refresh()
  }
  async function noShow(id) {
    await ProviderAPI.noShowBooking(id)
    refresh()
  }

  if (loading) return <div className="card h-32 animate-pulse" />

  if (bookings.length === 0) {
    return <div className="card p-8 text-center text-slate-500 dark:text-slate-400">No bookings yet.</div>
  }

  return (
    <ul className="flex flex-col gap-2">
      {bookings.map((b) => (
        <li key={b._id} className="card p-4 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="font-medium truncate">
              {b.customerId?.name} — {b.serviceId?.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {b.slotId ? new Date(b.slotId.startTime).toLocaleString() : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={BADGE_CLASS[b.status] || 'badge badge-cancelled'}>{b.status}</span>
            {b.status === 'confirmed' && (
              <div className="flex gap-2">
                <button onClick={() => complete(b._id)} className="btn btn-secondary !px-2 !py-1 text-xs">
                  Complete
                </button>
                <button onClick={() => noShow(b._id)} className="btn btn-danger !px-2 !py-1 text-xs">
                  No-show
                </button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ProviderDashboard() {
  const [tab, setTab] = useState('bookings')
  const tabs = [
    ['bookings', 'Bookings'],
    ['services', 'Services'],
    ['availability', 'Availability'],
    ['profile', 'Profile'],
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Provider dashboard</h1>
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={tab === key ? 'tab-btn tab-btn-active' : 'tab-btn'}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'bookings' && <BookingsSection />}
      {tab === 'services' && <ServicesSection />}
      {tab === 'availability' && <AvailabilitySection />}
      {tab === 'profile' && <ProfileSection />}
    </div>
  )
}
