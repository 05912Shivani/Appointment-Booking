const mongoose = require('mongoose')

// One-off overrides to the recurring rule: a full-day blackout (holiday) or
// an extra window on a specific date.
const availabilityExceptionSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" in provider's timezone
    type: { type: String, enum: ['blackout', 'extra'], required: true },
    startTime: { type: String }, // "HH:mm", required for type 'extra'
    endTime: { type: String },
  },
  { timestamps: true },
)

module.exports = mongoose.model('AvailabilityException', availabilityExceptionSchema)
