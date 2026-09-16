const app = require('./app')
const { connectDB } = require('./config/db')
const { scheduleJobs } = require('./jobs')
const { port } = require('./config/env')

async function start() {
  await connectDB()
  console.log('MongoDB connected')

  scheduleJobs()

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})
