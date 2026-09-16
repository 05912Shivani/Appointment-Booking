const express = require('express')
const ctrl = require('../controllers/admin.controller')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(requireAuth, requireRole('admin'))

router.get('/providers', ctrl.listProviders)
router.put('/providers/:providerId/active', ctrl.setProviderActive)
router.delete('/providers/:providerId', ctrl.deleteProvider)
router.get('/analytics', ctrl.analytics)
router.get('/audit-log', ctrl.listAuditLog)

module.exports = router
