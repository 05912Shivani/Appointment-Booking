const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const { clientOrigin, nodeEnv } = require('./config/env')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

const authRoutes = require('./routes/auth.routes')
const providerRoutes = require('./routes/provider.routes')
const publicRoutes = require('./routes/public.routes')
const bookingRoutes = require('./routes/booking.routes')
const adminRoutes = require('./routes/admin.routes')

const app = express()

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'))
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
// More specific prefix registered before the general public /api/providers
// browse routes, so /api/providers/me/* is never shadowed or shadows them.
app.use('/api/providers/me', providerRoutes)
app.use('/api', publicRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
