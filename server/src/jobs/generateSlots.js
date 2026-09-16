const { fromZonedTime } = require('date-fns-tz')
const { format, addDays, addMinutes } = require('date-fns')
const ProviderProfile = require('../models/ProviderProfile')
const Service = require('../models/Service')
const AvailabilityRule = require('../models/AvailabilityRule')
const AvailabilityException = require('../models/AvailabilityException')
const Slot = require('../models/Slot')
const { slotGenerationWeeks } = require('../config/env')

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// Computes the working windows (in "HH:mm" wall-clock strings, provider tz)
// for a specific calendar date, applying the recurring rule then exceptions.
function windowsForDate(dateStr, dayOfWeek, rules, exceptions) {
  const dayExceptions = exceptions.filter((e) => e.date === dateStr)
  if (dayExceptions.some((e) => e.type === 'blackout')) return []

  const windows = rules
    .filter((r) => r.dayOfWeek === dayOfWeek && r.isActive)
    .map((r) => ({ start: r.startTime, end: r.endTime }))

  for (const ex of dayExceptions) {
    if (ex.type === 'extra') windows.push({ start: ex.startTime, end: ex.endTime })
  }

  return windows
}

// Generates rolling slots for a single provider across all of their active
// services. Existing slots are left untouched (unique index + upsert-style
// skip), so already-booked slots are never overwritten.
async function generateSlotsForProvider(providerId, weeks = slotGenerationWeeks) {
  const [profile, rules, exceptions, services] = await Promise.all([
    ProviderProfile.findById(providerId),
    AvailabilityRule.find({ providerId }),
    AvailabilityException.find({ providerId }),
    Service.find({ providerId, isActive: true }),
  ])
  if (!profile || !profile.isActive || services.length === 0) return { created: 0 }

  const tz = profile.timezone
  const bufferMinutes = profile.bufferMinutes || 0
  const today = new Date()
  let created = 0
  const docsToInsert = []

  for (let d = 0; d < weeks * 7; d++) {
    const date = addDays(today, d)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const windows = windowsForDate(dateStr, dayOfWeek, rules, exceptions)
    if (windows.length === 0) continue

    for (const service of services) {
      const step = service.durationMinutes + bufferMinutes
      for (const win of windows) {
        let cursor = timeToMinutes(win.start)
        const endMinutes = timeToMinutes(win.end)
        while (cursor + service.durationMinutes <= endMinutes) {
          const startWallClock = `${dateStr}T${minutesToTime(cursor)}:00`
          const startUtc = fromZonedTime(startWallClock, tz)
          const endUtc = addMinutes(startUtc, service.durationMinutes)
          docsToInsert.push({
            providerId,
            serviceId: service._id,
            startTime: startUtc,
            endTime: endUtc,
            status: 'open',
          })
          cursor += step
        }
      }
    }
  }

  if (docsToInsert.length === 0) return { created: 0 }

  // ordered:false lets valid docs insert even when some collide with
  // already-existing slots on the unique (providerId, startTime) index.
  try {
    const result = await Slot.insertMany(docsToInsert, { ordered: false })
    created = result.length
  } catch (err) {
    if (err.insertedDocs) created = err.insertedDocs.length
    else if (err.code !== 11000) throw err
  }

  return { created }
}

async function generateSlotsForAllProviders() {
  const providers = await ProviderProfile.find({ isActive: true })
  let totalCreated = 0
  for (const provider of providers) {
    const { created } = await generateSlotsForProvider(provider._id)
    totalCreated += created
  }
  return { totalCreated, providerCount: providers.length }
}

module.exports = { generateSlotsForProvider, generateSlotsForAllProviders, windowsForDate }
