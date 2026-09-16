function validateBody(schema) {
  return (req, res, next) => {
    req.body = schema.parse(req.body)
    next()
  }
}

function validateQuery(schema) {
  return (req, res, next) => {
    req.query = schema.parse(req.query)
    next()
  }
}

module.exports = { validateBody, validateQuery }
