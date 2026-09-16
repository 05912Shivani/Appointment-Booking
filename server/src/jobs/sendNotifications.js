const nodemailer = require('nodemailer')
const Notification = require('../models/Notification')
const User = require('../models/User')
const env = require('../config/env')

let transporter = null
function getTransporter() {
  if (!env.email.host) return null
  transporter ??= nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    auth: env.email.user ? { user: env.email.user, pass: env.email.pass } : undefined,
  })
  return transporter
}

const SUBJECTS = {
  booking_confirmed: 'Your appointment is confirmed',
  booking_cancelled: 'Your appointment was cancelled',
  booking_rescheduled: 'Your appointment was rescheduled',
  reminder: 'Upcoming appointment reminder',
  waitlist_slot_available: 'A slot you waitlisted for is available',
}

async function sendPendingNotifications(limit = 50) {
  const pending = await Notification.find({ status: 'pending', sendAfter: { $lte: new Date() } }).limit(limit)
  let sent = 0
  let failed = 0

  for (const notification of pending) {
    try {
      const user = await User.findById(notification.userId)
      const mailer = getTransporter()
      if (mailer && user?.email) {
        await mailer.sendMail({
          from: env.email.from,
          to: user.email,
          subject: SUBJECTS[notification.type] || 'Appointment Booking update',
          text: JSON.stringify(notification.payload, null, 2),
        })
      }
      notification.status = 'sent'
      await notification.save()
      sent++
    } catch (err) {
      notification.attempts += 1
      notification.lastError = err.message
      notification.status = notification.attempts >= 5 ? 'failed' : 'pending'
      await notification.save()
      failed++
    }
  }

  return { sent, failed }
}

module.exports = { sendPendingNotifications }
