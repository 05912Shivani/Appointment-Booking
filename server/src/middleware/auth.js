const AppError = require('../utils/AppError')
const { verifyAccessToken } = require('../utils/tokens')
const User = require('../models/User')

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return next(new AppError('Authentication required', 401))
  }
  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403))
    }
    next()
  }
}

// Loads the full user document, used where fresh DB state (not just JWT claims) is needed.
async function loadUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return next(new AppError('User not found', 401))
    req.currentUser = user
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { requireAuth, requireRole, loadUser }
