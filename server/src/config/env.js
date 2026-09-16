require('dotenv').config()

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/appointment-booking'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  slotHoldMinutes: parseInt(process.env.SLOT_HOLD_MINUTES || '5', 10),
  slotGenerationWeeks: parseInt(process.env.SLOT_GENERATION_WEEKS || '4', 10),
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@appointment-booking.local',
  },
}
