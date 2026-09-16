const bcrypt = require('bcryptjs')
const User = require('../src/models/User')
const ProviderProfile = require('../src/models/ProviderProfile')
const Service = require('../src/models/Service')
const AvailabilityRule = require('../src/models/AvailabilityRule')
const AvailabilityException = require('../src/models/AvailabilityException')
const Slot = require('../src/models/Slot')
const { generateSlotsForProvider } = require('../src/jobs/generateSlots')

async function makeProvider(timezone = 'UTC') {
  const passwordHash = await bcrypt.hash('irrelevant', 4)
  const user = await User.create({ name: 'Provider', email: `p-${Date.now()}@example.com`, passwordHash, role: 'provider' })
  return ProviderProfile.create({ userId: user._id, businessName: 'Clinic', timezone })
}

describe('slot generation', () => {
  it('generates slots only within the active weekly window, and skips blackout dates', async () => {
    const profile = await makeProvider('UTC')
    const service = await Service.create({ providerId: profile._id, name: 'Consult', durationMinutes: 30, price: 10 })

    const today = new Date()
    const dayOfWeek = today.getDay()
    await AvailabilityRule.create({ providerId: profile._id, dayOfWeek, startTime: '09:00', endTime: '10:00' })

    const dateStr = today.toISOString().slice(0, 10)
    await AvailabilityException.create({ providerId: profile._id, date: dateStr, type: 'blackout' })

    const { created } = await generateSlotsForProvider(profile._id, 1)
    const slots = await Slot.find({ providerId: profile._id }).sort({ startTime: 1 })

    expect(created).toBe(slots.length)
    // No slot should fall on the blacked-out date.
    expect(slots.some((s) => s.startTime.toISOString().startsWith(dateStr))).toBe(false)
    // Every generated slot should be exactly 30 minutes (the service duration).
    for (const slot of slots) {
      expect(slot.endTime.getTime() - slot.startTime.getTime()).toBe(30 * 60 * 1000)
    }
  })

  it('is idempotent: running generation twice does not create duplicate slots', async () => {
    const profile = await makeProvider('UTC')
    await Service.create({ providerId: profile._id, name: 'Consult', durationMinutes: 30, price: 10 })
    const dayOfWeek = new Date().getDay()
    await AvailabilityRule.create({ providerId: profile._id, dayOfWeek, startTime: '09:00', endTime: '17:00' })

    await generateSlotsForProvider(profile._id, 1)
    const firstCount = await Slot.countDocuments({ providerId: profile._id })

    const { created: secondRunCreated } = await generateSlotsForProvider(profile._id, 1)
    const secondCount = await Slot.countDocuments({ providerId: profile._id })

    expect(secondRunCreated).toBe(0)
    expect(secondCount).toBe(firstCount)
  })

  it('respects an extra-hours exception outside the recurring rule', async () => {
    const profile = await makeProvider('UTC')
    await Service.create({ providerId: profile._id, name: 'Consult', durationMinutes: 60, price: 10 })
    // No recurring rule at all — availability comes only from the exception.
    const dateStr = new Date().toISOString().slice(0, 10)
    await AvailabilityException.create({
      providerId: profile._id,
      date: dateStr,
      type: 'extra',
      startTime: '18:00',
      endTime: '19:00',
    })

    const { created } = await generateSlotsForProvider(profile._id, 1)
    expect(created).toBe(1)
  })
})
