const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

auditLogSchema.index({ entityType: 1, entityId: 1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
