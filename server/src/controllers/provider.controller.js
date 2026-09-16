const { z } = require('zod')
const ProviderProfile = require('../models/ProviderProfile')
const Service = require('../models/Service')
const AvailabilityRule = require('../models/AvailabilityRule')
const AvailabilityException = require('../models/AvailabilityException')
const Booking = require('../models/Booking')
const AppError = require('../utils/AppError')
const { recordAudit } = require('../utils/audit')

async function getMyProfile(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  res.json(profile)
}

const updateProfileSchema = z.object({
  businessName: z.string().min(1).optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
  bufferMinutes: z.number().min(0).optional(),
  minCancelNoticeHours: z.number().min(0).optional(),
})

async function updateMyProfile(req, res) {
  const data = updateProfileSchema.parse(req.body)
  const profile = await ProviderProfile.findOneAndUpdate({ userId: req.user.id }, data, { returnDocument: 'after' })
  if (!profile) throw new AppError('Provider profile not found', 404)
  res.json(profile)
}

const serviceSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().min(5),
  price: z.number().min(0),
})

async function createService(req, res) {
  const data = serviceSchema.parse(req.body)
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const service = await Service.create({ ...data, providerId: profile._id })
  res.status(201).json(service)
}

async function listMyServices(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const services = await Service.find({ providerId: profile._id })
  res.json(services)
}

async function updateService(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const data = serviceSchema.partial().parse(req.body)
  const service = await Service.findOneAndUpdate({ _id: req.params.serviceId, providerId: profile._id }, data, {
    returnDocument: 'after',
  })
  if (!service) throw new AppError('Service not found', 404)
  res.json(service)
}

async function deactivateService(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  // Soft-delete only: existing future bookings for this service remain valid.
  const service = await Service.findOneAndUpdate(
    { _id: req.params.serviceId, providerId: profile._id },
    { isActive: false },
    { returnDocument: 'after' },
  )
  if (!service) throw new AppError('Service not found', 404)
  res.json(service)
}

const ruleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})

async function createAvailabilityRule(req, res) {
  const data = ruleSchema.parse(req.body)
  if (data.startTime >= data.endTime) throw new AppError('startTime must be before endTime', 400)
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const rule = await AvailabilityRule.create({ ...data, providerId: profile._id })
  res.status(201).json(rule)
}

async function listAvailabilityRules(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const rules = await AvailabilityRule.find({ providerId: profile._id, isActive: true })
  res.json(rules)
}

async function deleteAvailabilityRule(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  // Deactivating a rule only stops future slot generation (see jobs/generateSlots.js);
  // slots already generated and booked are untouched.
  const rule = await AvailabilityRule.findOneAndUpdate(
    { _id: req.params.ruleId, providerId: profile._id },
    { isActive: false },
    { returnDocument: 'after' },
  )
  if (!rule) throw new AppError('Availability rule not found', 404)
  res.json(rule)
}

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['blackout', 'extra']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

async function createAvailabilityException(req, res) {
  const data = exceptionSchema.parse(req.body)
  if (data.type === 'extra' && (!data.startTime || !data.endTime)) {
    throw new AppError('startTime and endTime are required for an extra-hours exception', 400)
  }
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const exception = await AvailabilityException.create({ ...data, providerId: profile._id })
  res.status(201).json(exception)
}

async function listAvailabilityExceptions(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const exceptions = await AvailabilityException.find({ providerId: profile._id })
  res.json(exceptions)
}

async function myBookings(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const bookings = await Booking.find({ providerId: profile._id })
    .populate('slotId')
    .populate('serviceId')
    .populate('customerId', 'name email phone')
    .sort({ createdAt: -1 })
  res.json(bookings)
}

async function markCompleted(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.bookingId, providerId: profile._id, status: 'confirmed' },
    { status: 'completed' },
    { returnDocument: 'after' },
  )
  if (!booking) throw new AppError('Confirmed booking not found', 404)
  await recordAudit({ actorId: req.user.id, action: 'booking.completed', entityType: 'Booking', entityId: booking._id })
  res.json(booking)
}

async function markNoShow(req, res) {
  const profile = await ProviderProfile.findOne({ userId: req.user.id })
  if (!profile) throw new AppError('Provider profile not found', 404)
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.bookingId, providerId: profile._id, status: 'confirmed' },
    { status: 'no_show' },
    { returnDocument: 'after' },
  )
  if (!booking) throw new AppError('Confirmed booking not found', 404)
  await recordAudit({ actorId: req.user.id, action: 'booking.no_show', entityType: 'Booking', entityId: booking._id })
  res.json(booking)
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  createService,
  listMyServices,
  updateService,
  deactivateService,
  createAvailabilityRule,
  listAvailabilityRules,
  deleteAvailabilityRule,
  createAvailabilityException,
  listAvailabilityExceptions,
  myBookings,
  markCompleted,
  markNoShow,
}
