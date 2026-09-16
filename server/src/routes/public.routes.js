const express = require('express')
const ctrl = require('../controllers/public.controller')

const router = express.Router()

router.get('/providers', ctrl.listProviders)
router.get('/providers/:providerId', ctrl.getProvider)
router.get('/providers/:providerId/services', ctrl.listProviderServices)
router.get('/providers/:providerId/slots', ctrl.listProviderSlots)

module.exports = router
