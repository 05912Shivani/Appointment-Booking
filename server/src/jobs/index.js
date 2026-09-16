const cron = require('node-cron')
const { generateSlotsForAllProviders } = require('./generateSlots')
const { releaseStaleHolds } = require('./releaseStaleHolds')
const { sendPendingNotifications } = require('./sendNotifications')

function scheduleJobs() {
  // Extend the rolling slot window daily.
  cron.schedule('0 2 * * *', () => {
    generateSlotsForAllProviders().catch((err) => console.error('generateSlots job failed', err))
  })

  // Release abandoned checkout holds every minute.
  cron.schedule('* * * * *', () => {
    releaseStaleHolds().catch((err) => console.error('releaseStaleHolds job failed', err))
  })

  // Flush the notification outbox every minute.
  cron.schedule('* * * * *', () => {
    sendPendingNotifications().catch((err) => console.error('sendNotifications job failed', err))
  })
}

module.exports = { scheduleJobs }
