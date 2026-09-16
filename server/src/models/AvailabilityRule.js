const mongoose = require('mongoose')

// Recurring weekly template, e.g. every Monday 09:00-17:00 (wall-clock time in the provider's timezone).
const availabilityRuleSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true }, // "HH:mm"
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('AvailabilityRule', availabilityRuleSchema)
