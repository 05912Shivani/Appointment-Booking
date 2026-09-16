const mongoose = require('mongoose')
const { z } = require('zod')
const Slot = require('../models/Slot')
const Booking = require('../models/Booking')
const ProviderProfile = require('../models/ProviderProfile')
const Waitlist = require('../models/Waitlist')
const AppError = require('../utils/AppError')
const { recordAudit } = require('../utils/audit')
const { queueNotification } = require('../utils/notify')
const { slotHoldMinutes } = require('../config/env')

async function findOverlappingActiveSlot(session, providerId, slot, excludeSlotId) {
  return Slot.findOne({
    _id: { $ne: excludeSlotId },
    providerId,
    status: { $in: ['held', 'booked'] },
    startTime: { $lt: slot.endTime },
    endTime: { $gt: slot.startTime },
  }).session(session)
}

const holdSchema = z.object({ slotId: z.string() })

async function holdSlot(req, res) {
  const { slotId } = holdSchema.parse(req.body)

  const session = await mongoose.startSession()
  try {
    let holdExpiresAt
    await session.withTransaction(async () => {
      const slot = await Slot.findById(slotId).session(session)
      if (!slot) throw new AppError('Slot not found', 404)
      if (slot.status !== 'open') throw new AppError('Slot is no longer available', 409)

      const overlapping = await findOverlappingActiveSlot(session, slot.providerId, slot, slot._id)
      if (overlapping) throw new AppError('Provider is not available for this time', 409)

      const now = new Date()
      const updated = await Slot.findOneAndUpdate(
        { _id: slotId, status: 'open' },
        { status: 'held', heldAt: now, heldBy: req.user.id },
        { returnDocument: 'after', session },
      )
      if (!updated) throw new AppError('Slot is no longer available', 409)
      holdExpiresAt = new Date(now.getTime() + slotHoldMinutes * 60 * 1000)
    })
    res.json({ slotId, holdExpiresAt })
  } finally {
    session.endSession()
  }
}

const confirmSchema = z.object({
  slotId: z.string(),
  idempotencyKey: z.string().optional(),
})

async function confirmBooking(req, res) {
  const { slotId, idempotencyKey } = confirmSchema.parse(req.body)

  if (idempotencyKey) {
    const existing = await Booking.findOne({ customerId: req.user.id, idempotencyKey })
    if (existing) return res.status(200).json(existing)
  }

  const session = await mongoose.startSession()
  try {
    let booking
    await session.withTransaction(async () => {
      const slot = await Slot.findOneAndUpdate(
        { _id: slotId, status: 'held', heldBy: req.user.id },
        { status: 'booked' },
        { returnDocument: 'after', session },
      )
      if (!slot) throw new AppError('Hold expired or invalid — please pick the slot again', 409)

      const created = await Booking.create(
        [
          {
            customerId: req.user.id,
            providerId: slot.providerId,
            serviceId: slot.serviceId,
            slotId: slot._id,
            status: 'confirmed',
            idempotencyKey,
          },
        ],
        { session },
      )
      booking = created[0]
    })

    await recordAudit({
      actorId: req.user.id,
      action: 'booking.confirmed',
      entityType: 'Booking',
      entityId: booking._id,
    })
    await queueNotification({
      userId: req.user.id,
      type: 'booking_confirmed',
      payload: { bookingId: booking._id, slotId },
    })

    res.status(201).json(booking)
  } finally {
    session.endSession()
  }
}

async function myBookings(req, res) {
  const bookings = await Booking.find({ customerId: req.user.id })
    .populate('slotId')
    .populate('serviceId')
    .sort({ createdAt: -1 })
  res.json(bookings)
}

const cancelSchema = z.object({ reason: z.string().optional() })

async function cancelBooking(req, res) {
  const { reason } = cancelSchema.parse(req.body || {})
  const booking = await Booking.findById(req.params.bookingId).populate('slotId')
  if (!booking) throw new AppError('Booking not found', 404)

  const isCustomer = booking.customerId.toString() === req.user.id
  const isProvider =
    req.user.role === 'provider' &&
    (await ProviderProfile.exists({ _id: booking.providerId, userId: req.user.id }))
  if (!isCustomer && !isProvider && req.user.role !== 'admin') {
    throw new AppError('Not authorized to cancel this booking', 403)
  }

  if (booking.status !== 'confirmed') throw new AppError('Only confirmed bookings can be cancelled', 400)

  if (isCustomer) {
    const profile = await ProviderProfile.findById(booking.providerId)
    const noticeMs = (profile?.minCancelNoticeHours || 0) * 60 * 60 * 1000
    if (booking.slotId.startTime.getTime() - Date.now() < noticeMs) {
      throw new AppError(`Cancellations require at least ${profile.minCancelNoticeHours}h notice`, 403)
    }
  }

  booking.status = 'cancelled'
  booking.cancellationReason = reason
  booking.cancelledBy = isProvider ? 'provider' : isCustomer ? 'customer' : 'system'
  await booking.save()

  await Slot.findByIdAndUpdate(booking.slotId._id, { status: 'open', $unset: { heldAt: '', heldBy: '' } })

  await recordAudit({
    actorId: req.user.id,
    action: 'booking.cancelled',
    entityType: 'Booking',
    entityId: booking._id,
    metadata: { reason, cancelledBy: booking.cancelledBy },
  })

  const notifyUserId = isCustomer ? null : booking.customerId
  if (notifyUserId) {
    await queueNotification({
      userId: notifyUserId,
      type: 'booking_cancelled',
      payload: { bookingId: booking._id, reason },
    })
  }

  const waiting = await Waitlist.findOne({ slotId: booking.slotId._id, claimedOrExpired: false }).sort({
    createdAt: 1,
  })
  if (waiting) {
    waiting.notifiedAt = new Date()
    await waiting.save()
    await queueNotification({
      userId: waiting.customerId,
      type: 'waitlist_slot_available',
      payload: { slotId: booking.slotId._id },
    })
  }

  res.json(booking)
}

const joinWaitlistSchema = z.object({ slotId: z.string() })

async function joinWaitlist(req, res) {
  const { slotId } = joinWaitlistSchema.parse(req.body)
  const slot = await Slot.findById(slotId)
  if (!slot) throw new AppError('Slot not found', 404)
  if (slot.status !== 'booked') throw new AppError('Slot is not currently full', 400)

  try {
    const entry = await Waitlist.create({ slotId, customerId: req.user.id })
    res.status(201).json(entry)
  } catch (err) {
    if (err.code === 11000) throw new AppError('Already on the waitlist for this slot', 409)
    throw err
  }
}

module.exports = { holdSlot, confirmBooking, myBookings, cancelBooking, joinWaitlist }
