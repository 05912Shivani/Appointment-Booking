const AppError = require('../utils/AppError')

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details })
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate resource conflict', details: err.keyValue })
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid input', details: err.issues })
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}

module.exports = { errorHandler, notFoundHandler }
