const mongoose = require('mongoose')
const { mongoUri } = require('./env')

async function connectDB(uri = mongoUri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  return mongoose.connection
}

async function disconnectDB() {
  await mongoose.disconnect()
}

module.exports = { connectDB, disconnectDB }
