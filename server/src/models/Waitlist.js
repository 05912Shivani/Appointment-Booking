const mongoose = require('mongoose')

const waitlistSchema = new mongoose.Schema(
  {
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notifiedAt: { type: Date },
    claimedOrExpired: { type: Boolean, default: false },
  },
  { timestamps: true },
)

waitlistSchema.index({ slotId: 1, customerId: 1 }, { unique: true })

module.exports = mongoose.model('Waitlist', waitlistSchema)
