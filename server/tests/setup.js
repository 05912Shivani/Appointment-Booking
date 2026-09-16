const { MongoMemoryReplSet } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let replSet

// Booking hold/confirm uses a transaction, which requires a replica set —
// a plain standalone in-memory mongod would silently fail those tests.
beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    binary: { version: '7.0.14' },
  })
  await replSet.waitUntilRunning()
  const uri = replSet.getUri()
  await mongoose.connect(uri)
}, 180000)

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await replSet.stop()
})
