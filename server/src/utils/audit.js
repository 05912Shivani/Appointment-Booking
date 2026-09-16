const AuditLog = require('../models/AuditLog')

async function recordAudit({ actorId, action, entityType, entityId, metadata }) {
  await AuditLog.create({ actorId, action, entityType, entityId, metadata })
}

module.exports = { recordAudit }
