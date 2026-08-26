const pool = require('../config/db');
const { getLogs } = require('../services/auditService');

/**
 * GET /api/admin/bookings — all bookings (paginated, filterable)
 */
const getAllBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { roomId, status, checkIn, checkOut } = req.query;

    let query = `
      SELECT b.id, b.room_id, b.user_id, b.check_in, b.check_out, b.status, b.total_price, b.created_at,
             r.room_number, r.type, r.image_url,
             u.email as guest_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (roomId) {
      query += ` AND b.room_id = $${paramIndex++}`;
      params.push(parseInt(roomId));
    }
    if (status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }
    if (checkIn) {
      query += ` AND b.check_in >= $${paramIndex++}`;
      params.push(checkIn);
    }
    if (checkOut) {
      query += ` AND b.check_out <= $${paramIndex++}`;
      params.push(checkOut);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    // Count
    let countQuery = 'SELECT COUNT(*) FROM bookings WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;
    if (roomId) {
      countQuery += ` AND room_id = $${countParamIndex++}`;
      countParams.push(parseInt(roomId));
    }
    if (status) {
      countQuery += ` AND status = $${countParamIndex++}`;
      countParams.push(status);
    }

    const [bookingsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      data: bookingsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/logs — activity logs from MongoDB (paginated)
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { roomId, outcome } = req.query;

    const result = await getLogs({ page, limit, roomId: roomId ? parseInt(roomId) : undefined, outcome });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/stats — dashboard stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [roomsCount, activeBookings, totalBookings] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM rooms WHERE is_active = true'),
      pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED' AND check_out > CURRENT_DATE"),
      pool.query('SELECT COUNT(*) FROM bookings'),
    ]);

    // Calculate occupancy rate
    const totalRooms = parseInt(roomsCount.rows[0].count);
    const active = parseInt(activeBookings.rows[0].count);
    const occupancyRate = totalRooms > 0 ? Math.round((active / totalRooms) * 100) : 0;

    res.json({
      totalRooms,
      activeBookings: active,
      totalBookings: parseInt(totalBookings.rows[0].count),
      occupancyRate,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/rooms — all rooms including inactive (for admin management)
 */
const getAllRooms = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [roomsResult, countResult] = await Promise.all([
      pool.query(
        'SELECT * FROM rooms ORDER BY room_number ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM rooms'),
    ]);

    res.json({
      data: roomsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users — list all users (paginated)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      pool.query(
        'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM users'),
    ]);

    res.json({
      data: usersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id — delete a user account
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'ValidationError', message: 'You cannot delete your own admin account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    }

    res.json({ message: `User ${result.rows[0].email} deleted successfully`, id });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/bookings/:id — delete a reservation
 */
const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id, room_id, user_id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Booking not found' });
    }

    const { invalidateRoomCache } = require('../services/cacheService');
    await invalidateRoomCache(result.rows[0].room_id);

    res.json({ message: 'Booking deleted successfully', id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllBookings, getActivityLogs, getDashboardStats, getAllRooms, getAllUsers, deleteUser, deleteBooking };
