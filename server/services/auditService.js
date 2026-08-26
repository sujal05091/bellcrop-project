const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/mongo');

// Activity log schema
const activityLogSchema = new mongoose.Schema({
  type: { type: String, required: true }, // BOOKING_ATTEMPT, BOOKING_CANCEL, etc.
  userId: { type: String, required: true },
  userEmail: { type: String },
  roomId: { type: Number },
  roomNumber: { type: String },
  requestedRange: {
    checkIn: { type: String },
    checkOut: { type: String },
  },
  outcome: { type: String, required: true }, // CONFIRMED, CONFLICT, ERROR, CANCELLED
  details: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Index for efficient paginated queries
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ roomId: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

/**
 * Log an activity to MongoDB. Best-effort, non-blocking.
 * Never throws — wraps in try/catch per PRD §9 risk mitigation.
 */
const logActivity = async ({ type, userId, userEmail, roomId, roomNumber, requestedRange, outcome, details }) => {
  try {
    if (!isMongoConnected()) {
      console.warn('MongoDB unavailable — skipping audit log');
      return;
    }
    // Fire and forget — don't await in the main request path
    ActivityLog.create({
      type,
      userId,
      userEmail,
      roomId,
      roomNumber,
      requestedRange,
      outcome,
      details,
    }).catch((err) => {
      console.warn('Audit log write failed:', err.message);
    });
  } catch (err) {
    console.warn('Audit log error:', err.message);
  }
};

/**
 * Query activity logs with pagination.
 */
const getLogs = async ({ page = 1, limit = 20, roomId, outcome } = {}) => {
  const query = {};
  if (roomId) query.roomId = roomId;
  if (outcome) query.outcome = outcome;

  const skip = (page - 1) * limit;
  const clampedLimit = Math.min(limit, 50);

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(clampedLimit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit: clampedLimit,
      total,
      totalPages: Math.ceil(total / clampedLimit),
    },
  };
};

module.exports = { logActivity, getLogs, ActivityLog };
