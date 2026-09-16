const mongoose = require('mongoose')

// Outbox pattern: requests write a pending notification instead of sending
// inline, so a slow/failing email provider never blocks the API response.
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'booking_confirmed',
        'booking_cancelled',
        'booking_rescheduled',
        'reminder',
        'waitlist_slot_available',
      ],
      required: true,
    },
    channel: { type: String, enum: ['email'], default: 'email' },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
    sendAfter: { type: Date, default: Date.now },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Notification', notificationSchema)
