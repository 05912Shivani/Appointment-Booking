// Usage: node src/scripts/createAdmin.js <name> <email> <password>
const bcrypt = require('bcryptjs')
const { connectDB, disconnectDB } = require('../config/db')
const User = require('../models/User')

async function main() {
  const [name, email, password] = process.argv.slice(2)
  if (!name || !email || !password) {
    console.error('Usage: node src/scripts/createAdmin.js <name> <email> <password>')
    process.exit(1)
  }

  await connectDB()
  const existing = await User.findOne({ email })
  if (existing) {
    console.error(`A user with email ${email} already exists`)
    await disconnectDB()
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ name, email, passwordHash, role: 'admin' })
  console.log(`Admin user created: ${email}`)
  await disconnectDB()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
