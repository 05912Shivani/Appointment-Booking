const ProviderProfile = require('../models/ProviderProfile')
const Booking = require('../models/Booking')
const AuditLog = require('../models/AuditLog')
const Service = require('../models/Service')
const AvailabilityRule = require('../models/AvailabilityRule')
const AvailabilityException = require('../models/AvailabilityException')
const Slot = require('../models/Slot')
const Waitlist = require('../models/Waitlist')
const User = require('../models/User')
const AppError = require('../utils/AppError')
const { recordAudit } = require('../utils/audit')

async function listProviders(req, res) {
  const providers = await ProviderProfile.find().populate('userId', 'name email')
  res.json(providers)
}

async function setProviderActive(req, res) {
  const provider = await ProviderProfile.findByIdAndUpdate(
    req.params.providerId,
    { isActive: req.body.isActive },
    { returnDocument: 'after' },
  )
  res.json(provider)
}

async function analytics(req, res) {
  const [statusCounts, totalBookings] = await Promise.all([
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.countDocuments(),
  ])

  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]))
  const noShowRate = totalBookings ? (counts.no_show || 0) / totalBookings : 0
  const cancellationRate = totalBookings ? (counts.cancelled || 0) / totalBookings : 0

  const perProvider = await Booking.aggregate([
    { $group: { _id: { providerId: '$providerId', status: '$status' }, count: { $sum: 1 } } },
  ])

  res.json({
    totalBookings,
    statusCounts: counts,
    noShowRate,
    cancellationRate,
    perProvider,
  })
}

// Hard-delete is only permitted when the provider has zero booking history —
// any real customer interaction (even a cancelled/completed booking) means
// deactivation is the only allowed path, so audit/transaction history is
// never destroyed. This is meant for cleaning up test/junk accounts, not for
// removing a real provider.
async function deleteProvider(req, res) {
  const provider = await ProviderProfile.findById(req.params.providerId)
  if (!provider) throw new AppError('Provider not found', 404)

  const hasBookingHistory = await Booking.exists({ providerId: provider._id })
  if (hasBookingHistory) {
    throw new AppError(
      'This provider has booking history and cannot be deleted — deactivate it instead to preserve records.',
      409,
    )
  }

  const slots = await Slot.find({ providerId: provider._id }).select('_id')
  const slotIds = slots.map((s) => s._id)

  await Waitlist.deleteMany({ slotId: { $in: slotIds } })
  await Slot.deleteMany({ providerId: provider._id })
  await Service.deleteMany({ providerId: provider._id })
  await AvailabilityRule.deleteMany({ providerId: provider._id })
  await AvailabilityException.deleteMany({ providerId: provider._id })
  await User.findByIdAndDelete(provider.userId)
  await provider.deleteOne()

  await recordAudit({
    actorId: req.user.id,
    action: 'provider.deleted',
    entityType: 'ProviderProfile',
    entityId: provider._id,
    metadata: { businessName: provider.businessName },
  })

  res.status(204).send()
}

async function listAuditLog(req, res) {
  const page = parseInt(req.query.page || '1', 10)
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200)
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('actorId', 'name email role')
  res.json(logs)
}

module.exports = { listProviders, setProviderActive, deleteProvider, analytics, listAuditLog }
