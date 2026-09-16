const mongoose = require('mongoose')

const providerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    bio: { type: String, trim: true, default: '' },
    timezone: { type: String, required: true, default: 'UTC' },
    bufferMinutes: { type: Number, default: 0, min: 0 },
    minCancelNoticeHours: { type: Number, default: 2, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('ProviderProfile', providerProfileSchema)
