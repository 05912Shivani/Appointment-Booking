const { z } = require('zod')
const ProviderProfile = require('../models/ProviderProfile')
const Service = require('../models/Service')
const Slot = require('../models/Slot')
const AppError = require('../utils/AppError')

async function listProviders(req, res) {
  const providers = await ProviderProfile.find({ isActive: true }).select('businessName bio timezone')
  res.json(providers)
}

async function getProvider(req, res) {
  const provider = await ProviderProfile.findOne({ _id: req.params.providerId, isActive: true })
  if (!provider) throw new AppError('Provider not found', 404)
  res.json(provider)
}

async function listProviderServices(req, res) {
  const services = await Service.find({ providerId: req.params.providerId, isActive: true })
  res.json(services)
}

const slotQuerySchema = z.object({
  serviceId: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
})

async function listProviderSlots(req, res) {
  const { serviceId, from, to } = slotQuerySchema.parse(req.query)
  // Includes held/booked slots (not just open ones) and today's already-past
  // slots, so the client can render the full schedule with booked/past slots
  // shown as disabled rather than silently missing from the grid.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const filter = {
    providerId: req.params.providerId,
    serviceId,
    status: { $in: ['open', 'held', 'booked'] },
    startTime: { $gte: from ? new Date(from) : startOfToday },
  }
  if (to) filter.startTime.$lte = new Date(to)

  const slots = await Slot.find(filter).sort({ startTime: 1 }).limit(500)
  res.json(slots)
}

module.exports = { listProviders, getProvider, listProviderServices, listProviderSlots }
