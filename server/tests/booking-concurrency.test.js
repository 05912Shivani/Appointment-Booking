const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/User')
const ProviderProfile = require('../src/models/ProviderProfile')
const Service = require('../src/models/Service')
const Slot = require('../src/models/Slot')
const Booking = require('../src/models/Booking')
const bcrypt = require('bcryptjs')

async function registerCustomer(email) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Customer', email, password: 'supersecret1' })
  return res.body.accessToken
}

async function makeProviderWithOpenSlot() {
  const passwordHash = await bcrypt.hash('irrelevant', 4)
  const providerUser = await User.create({
    name: 'Provider',
    email: 'provider@example.com',
    passwordHash,
    role: 'provider',
  })
  const profile = await ProviderProfile.create({
    userId: providerUser._id,
    businessName: 'Test Clinic',
    timezone: 'UTC',
  })
  const service = await Service.create({ providerId: profile._id, name: 'Consult', durationMinutes: 30, price: 10 })
  const slot = await Slot.create({
    providerId: profile._id,
    serviceId: service._id,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    status: 'open',
  })
  return { profile, service, slot }
}

describe('booking concurrency', () => {
  it('allows only one of two simultaneous hold requests on the same slot to succeed', async () => {
    const { slot } = await makeProviderWithOpenSlot()
    const [tokenA, tokenB] = await Promise.all([
      registerCustomer('customerA@example.com'),
      registerCustomer('customerB@example.com'),
    ])

    const [resA, resB] = await Promise.all([
      request(app).post('/api/bookings/hold').set('Authorization', `Bearer ${tokenA}`).send({ slotId: slot._id }),
      request(app).post('/api/bookings/hold').set('Authorization', `Bearer ${tokenB}`).send({ slotId: slot._id }),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([200, 409])

    const winner = resA.status === 200 ? tokenA : tokenB
    const confirmRes = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${winner}`)
      .send({ slotId: slot._id })
    expect(confirmRes.status).toBe(201)

    const bookingCount = await Booking.countDocuments({ slotId: slot._id })
    expect(bookingCount).toBe(1)
  })

  it('rejects confirming a hold that belongs to another user', async () => {
    const { slot } = await makeProviderWithOpenSlot()
    const [tokenA, tokenB] = await Promise.all([
      registerCustomer('customerA@example.com'),
      registerCustomer('customerB@example.com'),
    ])

    await request(app).post('/api/bookings/hold').set('Authorization', `Bearer ${tokenA}`).send({ slotId: slot._id })

    const confirmRes = await request(app)
      .post('/api/bookings/confirm')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ slotId: slot._id })
    expect(confirmRes.status).toBe(409)
  })
})
