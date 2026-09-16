const jwt = require('jsonwebtoken')
const { jwtSecret, jwtRefreshSecret, accessTokenTtl, refreshTokenTtl } = require('../config/env')

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, {
    expiresIn: accessTokenTtl,
  })
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, jwtRefreshSecret, {
    expiresIn: refreshTokenTtl,
  })
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret)
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtRefreshSecret)
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }
