const pool = require('../config/db');
const { createBooking, cancelBooking } = require('../services/bookingService');

/**
 * POST /api/bookings — create a booking (the critical concurrency path)
 */
const create = async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    const result = await createBooking({
      roomId,
      checkIn,
      checkOut,
      userId: req.user.id,
      userEmail: req.user.email,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error,
        message: result.message,
      });
    }

    res.status(201).json({
      message: 'Booking confirmed',
      booking: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/me — guest's own bookings (paginated, filterable)
 */
const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status; // CONFIRMED, CANCELLED, or 'upcoming', 'past'

    let query = `
      SELECT b.id, b.room_id, b.check_in, b.check_out, b.status, b.total_price, b.created_at,
             r.room_number, r.type, r.image_url, r.price_per_night
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status === 'upcoming') {
      query += ` AND b.status = 'CONFIRMED' AND b.check_in > CURRENT_DATE`;
    } else if (status === 'past') {
      query += ` AND b.check_out <= CURRENT_DATE`;
    } else if (status === 'CANCELLED' || status === 'CONFIRMED') {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    // Count query
    let countQuery = 'SELECT COUNT(*) FROM bookings WHERE user_id = $1';
    const countParams = [userId];
    if (status === 'upcoming') {
      countQuery += ` AND status = 'CONFIRMED' AND check_in > CURRENT_DATE`;
    } else if (status === 'past') {
      countQuery += ` AND check_out <= CURRENT_DATE`;
    } else if (status === 'CANCELLED' || status === 'CONFIRMED') {
      countQuery += ` AND status = $2`;
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
 * PATCH /api/bookings/:id/cancel — cancel own booking
 */
const cancel = async (req, res, next) => {
  try {
    const result = await cancelBooking({
      bookingId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email,
      isAdmin: req.user.role === 'admin',
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        error: result.error,
        message: result.message,
      });
    }

    res.json({ message: 'Booking cancelled', booking: result.data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookings/:id — get single booking (owner or admin)
 */
const getBooking = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.*, r.room_number, r.type, r.image_url, r.price_per_night, r.capacity, r.description, r.amenities
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Booking not found' });
    }

    const booking = result.rows[0];

    // Only owner or admin can view
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getMyBookings, cancel, getBooking };
