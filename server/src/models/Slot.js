const mongoose = require('mongoose')

const slotSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    startTime: { type: Date, required: true }, // stored in UTC
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'held', 'booked', 'cancelled'],
      default: 'open',
      required: true,
    },
    heldAt: { type: Date },
    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

// DB-level guarantee: no two slots for the same provider can start at the same instant.
slotSchema.index({ providerId: 1, startTime: 1 }, { unique: true })
slotSchema.index({ providerId: 1, status: 1, startTime: 1 })

module.exports = mongoose.model('Slot', slotSchema)
