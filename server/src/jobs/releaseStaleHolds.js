const Slot = require('../models/Slot')
const { slotHoldMinutes } = require('../config/env')

async function releaseStaleHolds() {
  const cutoff = new Date(Date.now() - slotHoldMinutes * 60 * 1000)
  const result = await Slot.updateMany(
    { status: 'held', heldAt: { $lt: cutoff } },
    { $set: { status: 'open' }, $unset: { heldAt: '' } },
  )
  return { released: result.modifiedCount }
}

module.exports = { releaseStaleHolds }
