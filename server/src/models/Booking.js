const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'confirmed',
      required: true,
    },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ['customer', 'provider', 'system'] },
    idempotencyKey: { type: String, index: true },
  },
  { timestamps: true },
)

// Second safety net against double-booking: only one *active* booking may
// reference a given slot at a time. Partial index excludes cancelled bookings
// so a slot can be rebooked after a cancellation.
bookingSchema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmed', 'completed', 'no_show'] } } },
)

module.exports = mongoose.model('Booking', bookingSchema)
