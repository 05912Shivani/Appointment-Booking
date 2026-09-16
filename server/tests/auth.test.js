const request = require('supertest')
const app = require('../src/app')

describe('auth', () => {
  const credentials = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'supersecret1' }

  it('registers and logs in a customer', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(credentials)
    expect(registerRes.status).toBe(201)
    expect(registerRes.body.accessToken).toBeDefined()
    expect(registerRes.body.user.role).toBe('customer')

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body.accessToken).toBeDefined()
  })

  it('rejects duplicate registration', async () => {
    await request(app).post('/api/auth/register').send(credentials)
    const res = await request(app).post('/api/auth/register').send(credentials)
    expect(res.status).toBe(409)
  })

  it('rejects bad login credentials', async () => {
    await request(app).post('/api/auth/register').send(credentials)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrongpassword' })
    expect(res.status).toBe(401)
  })

  it('refreshes an access token using the refresh cookie', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(credentials)
    const cookie = registerRes.headers['set-cookie']
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()
  })
})
