const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer', required: true },
    phone: { type: String, trim: true },
    timezone: { type: String, default: 'UTC' },
    isGuest: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
