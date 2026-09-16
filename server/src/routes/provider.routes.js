const express = require('express')
const ctrl = require('../controllers/provider.controller')
const { requireAuth, requireRole } = require('../middleware/auth')

// NOTE: mounted at /api/providers/me in app.js — this must stay a more
// specific prefix than the public /api/providers browse routes so it is
// matched first and never mistaken for a public :providerId path.
const router = express.Router()

router.use(requireAuth, requireRole('provider'))

router.get('/', ctrl.getMyProfile)
router.put('/', ctrl.updateMyProfile)

router.get('/services', ctrl.listMyServices)
router.post('/services', ctrl.createService)
router.put('/services/:serviceId', ctrl.updateService)
router.delete('/services/:serviceId', ctrl.deactivateService)

router.get('/availability-rules', ctrl.listAvailabilityRules)
router.post('/availability-rules', ctrl.createAvailabilityRule)
router.delete('/availability-rules/:ruleId', ctrl.deleteAvailabilityRule)

router.get('/availability-exceptions', ctrl.listAvailabilityExceptions)
router.post('/availability-exceptions', ctrl.createAvailabilityException)

router.get('/bookings', ctrl.myBookings)
router.post('/bookings/:bookingId/complete', ctrl.markCompleted)
router.post('/bookings/:bookingId/no-show', ctrl.markNoShow)

module.exports = router
