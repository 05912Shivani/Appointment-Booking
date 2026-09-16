const express = require('express')
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', authLimiter, ctrl.register)
router.post('/login', authLimiter, ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)
router.get('/me', requireAuth, ctrl.me)

module.exports = router
