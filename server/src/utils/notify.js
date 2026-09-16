const Notification = require('../models/Notification')

async function queueNotification({ userId, type, payload, sendAfter }) {
  await Notification.create({ userId, type, payload, sendAfter: sendAfter || new Date() })
}

module.exports = { queueNotification }
