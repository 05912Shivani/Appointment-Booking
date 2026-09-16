const bcrypt = require('bcryptjs')
const { z } = require('zod')
const User = require('../models/User')
const ProviderProfile = require('../models/ProviderProfile')
const AppError = require('../utils/AppError')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/tokens')
const { refreshTokenTtlMs, nodeEnv } = require('../config/env')

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['customer', 'provider']).default('customer'),
  phone: z.string().optional(),
  timezone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const cookieOptions = {
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: refreshTokenTtlMs,
  path: '/api/auth',
}

function issueTokens(res, user) {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)
  res.cookie('refreshToken', refreshToken, cookieOptions)
  return accessToken
}

async function register(req, res) {
  const data = registerSchema.parse(req.body)
  const existing = await User.findOne({ email: data.email })
  if (existing) throw new AppError('Email already registered', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    phone: data.phone,
    timezone: data.timezone || 'UTC',
  })

  if (user.role === 'provider') {
    await ProviderProfile.create({ userId: user._id, businessName: data.name, timezone: user.timezone })
  }

  const accessToken = issueTokens(res, user)
  res.status(201).json({
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

async function login(req, res) {
  const data = loginSchema.parse(req.body)
  const user = await User.findOne({ email: data.email })
  if (!user) throw new AppError('Invalid email or password', 401)

  const valid = await bcrypt.compare(data.password, user.passwordHash)
  if (!valid) throw new AppError('Invalid email or password', 401)

  const accessToken = issueTokens(res, user)
  res.json({
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken
  if (!token) throw new AppError('No refresh token', 401)

  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw new AppError('Invalid or expired refresh token', 401)
  }

  const user = await User.findById(payload.sub)
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new AppError('Refresh token no longer valid', 401)
  }

  const accessToken = issueTokens(res, user)
  res.json({ accessToken })
}

async function logout(req, res) {
  res.clearCookie('refreshToken', { path: '/api/auth' })
  res.status(204).send()
}

async function me(req, res) {
  const user = await User.findById(req.user.id).select('name email role timezone')
  if (!user) throw new AppError('User not found', 404)
  res.json({ user })
}

module.exports = { register, login, refresh, logout, me }
