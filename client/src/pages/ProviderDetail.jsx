import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PublicAPI, BookingAPI } from '../api/endpoints.js'
import { useAuth } from '../context/AuthContext.jsx'

function formatSlot(slot) {
  return new Date(slot.startTime).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSlotLong(slot) {
  return new Date(slot.startTime).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ProviderDetail() {
  const { providerId } = useParams()
  const { user } = useAuth()
  const [provider, setProvider] = useState(null)
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [selectedService, setSelectedService] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [lastBooked, setLastBooked] = useState(null)

  const selectedServiceDetails = services.find((s) => s._id === selectedService)

  useEffect(() => {
    PublicAPI.getProvider(providerId).then(setProvider)
    PublicAPI.listServices(providerId)
      .then((list) => {
        setServices(list)
        if (list.length > 0) setSelectedService(list[0]._id)
      })
      .finally(() => setServicesLoading(false))
  }, [providerId])

  useEffect(() => {
    setSelectedSlot(null)
    setError('')
    if (!selectedService) {
      setSlots([])
      return
    }
    setSlotsLoading(true)
    PublicAPI.listSlots(providerId, selectedService)
      .then(setSlots)
      .finally(() => setSlotsLoading(false))
  }, [providerId, selectedService])

  function isSlotUnavailable(slot) {
    return slot.status !== 'open' || new Date(slot.startTime) <= new Date()
  }

  function selectSlot(slot) {
    if (isSlotUnavailable(slot)) return
    setError('')
    setLastBooked(null)
    setSelectedSlot((prev) => (prev?._id === slot._id ? null : slot))
  }

  async function confirmBooking() {
    if (!user) {
      setError('Please log in as a customer to book.')
      return
    }
    if (!selectedSlot) return
    setError('')
    setConfirming(true)
    const slotToBook = selectedSlot
    try {
      await BookingAPI.hold(slotToBook._id)
      const idempotencyKey = crypto.randomUUID()
      await BookingAPI.confirm(slotToBook._id, idempotencyKey)
      setSlots((prev) => prev.map((s) => (s._id === slotToBook._id ? { ...s, status: 'booked' } : s)))
      setSelectedSlot(null)
      setLastBooked(slotToBook)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not book this slot — it may have just been taken. Refreshing...')
      setSelectedSlot(null)
      PublicAPI.listSlots(providerId, selectedService).then(setSlots)
    } finally {
      setConfirming(false)
    }
  }

  if (!provider) return <div className="card h-32 animate-pulse" />

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 dark:text-indigo-400 mb-4 inline-block">
        ← Back to providers
      </Link>
      <h1 className="text-2xl font-semibold">{provider.businessName}</h1>
      {provider.bio && <p className="text-slate-500 dark:text-slate-400 mt-1">{provider.bio}</p>}

      {servicesLoading && (
        <div className="flex gap-2 my-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 w-32 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {!servicesLoading && services.length === 0 && (
        <div className="card p-6 my-5 text-center text-slate-500 dark:text-slate-400 text-sm">
          This provider hasn't added any services yet — check back later.
        </div>
      )}

      {!servicesLoading && services.length > 0 && (
        <div className="flex gap-2 my-5 flex-wrap">
          {services.map((s) => (
            <button
              key={s._id}
              onClick={() => setSelectedService(s._id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                selectedService === s._id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {s.name} <span className="text-xs opacity-70">· {s.durationMinutes}m · ${s.price}</span>
            </button>
          ))}
        </div>
      )}

      {lastBooked && (
        <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-sm px-4 py-3 flex items-start gap-2">
          <span className="text-lg leading-none">✓</span>
          <span>
            Booking confirmed for <span className="font-semibold">{formatSlotLong(lastBooked)}</span>. Check{' '}
            <Link to="/my-bookings" className="underline font-medium">
              My Bookings
            </Link>
            .
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-sm px-4 py-2">
          {error}
        </div>
      )}

      {selectedService && slotsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {selectedService && !slotsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlot?._id === slot._id
            const isPast = new Date(slot.startTime) <= new Date()
            const isTaken = slot.status !== 'open'
            const isUnavailable = isPast || isTaken

            let stateClass
            if (isSelected) {
              stateClass = 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
            } else if (isUnavailable) {
              stateClass =
                'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
            } else {
              stateClass =
                'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-950/30'
            }

            return (
              <button
                key={slot._id}
                onClick={() => selectSlot(slot)}
                disabled={isUnavailable}
                aria-pressed={isSelected}
                className={`relative rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${stateClass}`}
              >
                {isSelected && <span className="mr-1">✓</span>}
                {formatSlot(slot)}
                {isUnavailable && !isSelected && (
                  <span className="block text-xs font-normal opacity-75">{isPast ? 'Past' : 'Booked'}</span>
                )}
              </button>
            )
          })}
          {slots.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 col-span-full">
              No slots scheduled right now — check back later.
            </p>
          )}
        </div>
      )}

      {/* Reserves space so the fixed confirmation bar below never covers the last row of slots. */}
      {selectedSlot && <div className="h-28 sm:h-20" />}

      {selectedSlot && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 w-auto sm:w-full sm:max-w-lg">
          <div className="card p-4 border-indigo-300 dark:border-indigo-800 shadow-lg flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">
                You selected
              </p>
              <p className="font-semibold truncate">{formatSlotLong(selectedSlot)}</p>
              {selectedServiceDetails && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedServiceDetails.name} · {selectedServiceDetails.durationMinutes} min · $
                  {selectedServiceDetails.price}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setSelectedSlot(null)} disabled={confirming} className="btn btn-secondary">
                Change
              </button>
              <button onClick={confirmBooking} disabled={confirming} className="btn btn-primary">
                {confirming ? 'Booking...' : 'Confirm booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
