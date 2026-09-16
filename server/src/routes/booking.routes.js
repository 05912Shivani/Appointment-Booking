const express = require('express')
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/booking.controller')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

router.use(requireAuth)

router.post('/hold', bookingLimiter, ctrl.holdSlot)
router.post('/confirm', bookingLimiter, ctrl.confirmBooking)
router.get('/me', ctrl.myBookings)
router.post('/:bookingId/cancel', ctrl.cancelBooking)
router.post('/waitlist', ctrl.joinWaitlist)

module.exports = router
