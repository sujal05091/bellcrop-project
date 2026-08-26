const pool = require('../config/db');
const { getCache, setCache, invalidateCache } = require('../services/cacheService');

/**
 * GET /api/rooms — list active rooms (paginated, cached)
 */
const listRooms = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const type = req.query.type;

    // Try cache first
    const cacheKey = `rooms:list:${page}:${limit}:${type || 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = 'SELECT id, room_number, type, capacity, price_per_night, is_active, image_url, description, amenities FROM rooms WHERE is_active = true';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    query += ` ORDER BY room_number ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const [roomsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(
        'SELECT COUNT(*) FROM rooms WHERE is_active = true' + (type ? ' AND type = $1' : ''),
        type ? [type] : []
      ),
    ]);

    const response = {
      data: roomsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    };

    // Cache for 60 seconds
    await setCache(cacheKey, response, 60);

    res.json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rooms/:id — get single room
 */
const getRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cacheKey = `room:${id}:detail`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const result = await pool.query(
      'SELECT id, room_number, type, capacity, price_per_night, is_active, image_url, description, amenities FROM rooms WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Room not found' });
    }

    await setCache(cacheKey, result.rows[0], 60);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rooms/:id/availability?checkIn=&checkOut= — check availability (cached)
 */
const checkAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'checkIn and checkOut query parameters are required',
      });
    }

    const cacheKey = `room:${id}:avail:${checkIn}:${checkOut}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    // Check if room exists
    const roomResult = await pool.query('SELECT id, is_active FROM rooms WHERE id = $1', [id]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Room not found' });
    }

    if (!roomResult.rows[0].is_active) {
      const response = { available: false, message: 'Room is not available' };
      return res.json(response);
    }

    // Check overlap with CONFIRMED bookings — half-open interval [checkIn, checkOut)
    const overlapResult = await pool.query(
      `SELECT id FROM bookings
       WHERE room_id = $1
         AND status = 'CONFIRMED'
         AND check_in < $3
         AND check_out > $2
       LIMIT 1`,
      [id, checkIn, checkOut]
    );

    const available = overlapResult.rows.length === 0;
    const response = { available, message: available ? 'Room is available' : 'Room is not available for selected dates' };

    // Cache for 30 seconds (shorter TTL for availability)
    await setCache(cacheKey, response, 30);

    res.json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rooms — create room (admin only)
 */
const createRoom = async (req, res, next) => {
  try {
    const { room_number, type, capacity, price_per_night, description, amenities, image_url } = req.body;

    const result = await pool.query(
      `INSERT INTO rooms (room_number, type, capacity, price_per_night, description, amenities, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [room_number, type, capacity, price_per_night, description || null, amenities || [], image_url || null]
    );

    await invalidateCache('rooms:list:*');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/rooms/:id — update room (admin only)
 */
const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['room_number', 'type', 'capacity', 'price_per_night', 'is_active', 'description', 'amenities', 'image_url'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'ValidationError', message: 'No valid fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE rooms SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Room not found' });
    }

    await invalidateCache('rooms:list:*');
    await invalidateCache(`room:${id}:*`);

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { listRooms, getRoom, checkAvailability, createRoom, updateRoom };
