const request = require('supertest')
const bcrypt = require('bcryptjs')
const app = require('../src/app')
const User = require('../src/models/User')
const ProviderProfile = require('../src/models/ProviderProfile')
const Service = require('../src/models/Service')
const Slot = require('../src/models/Slot')
const Booking = require('../src/models/Booking')

async function loginAsAdmin(email, password) {
  const passwordHash = await bcrypt.hash(password, 4)
  await User.create({ name: 'Admin', email, passwordHash, role: 'admin' })
  const res = await request(app).post('/api/auth/login').send({ email, password })
  return res.body.accessToken
}

async function makeProvider() {
  const passwordHash = await bcrypt.hash('irrelevant', 4)
  const providerUser = await User.create({ name: 'Provider', email: 'provider@example.com', passwordHash, role: 'provider' })
  const profile = await ProviderProfile.create({ userId: providerUser._id, businessName: 'Test Clinic', timezone: 'UTC' })
  const service = await Service.create({ providerId: profile._id, name: 'Consult', durationMinutes: 30, price: 10 })
  return { providerUser, profile, service }
}

describe('admin provider deletion', () => {
  it('hard-deletes a provider with no booking history, cascading related data', async () => {
    const adminToken = await loginAsAdmin('admin1@example.com', 'password123')
    const { providerUser, profile, service } = await makeProvider()
    const slot = await Slot.create({
      providerId: profile._id,
      serviceId: service._id,
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 90 * 60 * 1000),
      status: 'open',
    })

    const res = await request(app)
      .delete(`/api/admin/providers/${profile._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(204)

    expect(await ProviderProfile.findById(profile._id)).toBeNull()
    expect(await User.findById(providerUser._id)).toBeNull()
    expect(await Service.findById(service._id)).toBeNull()
    expect(await Slot.findById(slot._id)).toBeNull()
  })

  it('refuses to delete a provider that has any booking history', async () => {
    const adminToken = await loginAsAdmin('admin2@example.com', 'password123')
    const { profile, service } = await makeProvider()
    const slot = await Slot.create({
      providerId: profile._id,
      serviceId: service._id,
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 90 * 60 * 1000),
      status: 'cancelled',
    })
    const passwordHash = await bcrypt.hash('irrelevant', 4)
    const customer = await User.create({ name: 'Cust', email: 'cust@example.com', passwordHash, role: 'customer' })
    await Booking.create({
      customerId: customer._id,
      providerId: profile._id,
      serviceId: service._id,
      slotId: slot._id,
      status: 'cancelled',
    })

    const res = await request(app)
      .delete(`/api/admin/providers/${profile._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(409)

    expect(await ProviderProfile.findById(profile._id)).not.toBeNull()
  })
})
