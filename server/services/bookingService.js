const pool = require('../config/db');
const { acquireLock, releaseLock, invalidateCache } = require('./cacheService');
const { logActivity } = require('./auditService');

/**
 * Create a booking with concurrency-safe transactional locking.
 * 
 * CRITICAL PATH — follows 03-Architecture.md §5 exactly:
 * 1. Acquire Redis lock (defense-in-depth, not source of truth)
 * 2. Open Postgres transaction
 * 3. SELECT ... FOR UPDATE on room row (serializes all booking attempts for this room)
 * 4. Check overlap against CONFIRMED bookings
 * 5. INSERT or ROLLBACK
 * 6. Release Redis lock
 * 7. Invalidate cache
 * 8. Fire-and-forget audit log
 * 
 * Overlap semantics (FR-8): [checkIn, checkOut) half-open intervals
 *   Two ranges overlap iff: A_in < B_out AND B_in < A_out
 *   Checkout day == checkin day is NOT an overlap
 */
const createBooking = async ({ roomId, checkIn, checkOut, userId, userEmail }) => {
  const lockKey = `lock:room:${roomId}`;
  let lockToken = null;
  let client = null;

  try {
    // Step 1: Redis distributed lock (secondary guard — fast-fail under extreme contention)
    lockToken = await acquireLock(lockKey, 5000);
    if (lockToken === null) {
      // Lock contention — another request is actively booking this room
      // Log and return conflict
      logActivity({
        type: 'BOOKING_ATTEMPT',
        userId,
        userEmail,
        roomId,
        requestedRange: { checkIn, checkOut },
        outcome: 'CONFLICT',
        details: 'Redis lock contention — fast-fail',
      });
      return {
        success: false,
        statusCode: 409,
        error: 'Conflict',
        message: 'Room is currently being booked. Please try again.',
      };
    }

    // Step 2: Open Postgres transaction
    client = await pool.connect();
    await client.query('BEGIN');

    try {
      // Step 3: Lock the room row to serialize all concurrent booking attempts
      const roomResult = await client.query(
        'SELECT id, room_number, price_per_night, is_active FROM rooms WHERE id = $1 FOR UPDATE',
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          statusCode: 404,
          error: 'NotFound',
          message: 'Room not found',
        };
      }

      const room = roomResult.rows[0];
      if (!room.is_active) {
        await client.query('ROLLBACK');
        return {
          success: false,
          statusCode: 400,
          error: 'ValidationError',
          message: 'Room is no longer available for booking',
        };
      }

      // Step 4: Check for overlapping CONFIRMED bookings
      // Overlap condition: existing.check_in < newCheckOut AND existing.check_out > newCheckIn
      const overlapResult = await client.query(
        `SELECT id, check_in, check_out FROM bookings
         WHERE room_id = $1
           AND status = 'CONFIRMED'
           AND check_in < $3
           AND check_out > $2`,
        [roomId, checkIn, checkOut]
      );

      if (overlapResult.rows.length > 0) {
        // Overlap found — ROLLBACK and return 409
        await client.query('ROLLBACK');

        logActivity({
          type: 'BOOKING_ATTEMPT',
          userId,
          userEmail,
          roomId,
          roomNumber: room.room_number,
          requestedRange: { checkIn, checkOut },
          outcome: 'CONFLICT',
          details: `Overlaps with existing booking(s): ${overlapResult.rows.map(r => `${r.check_in}–${r.check_out}`).join(', ')}`,
        });

        return {
          success: false,
          statusCode: 409,
          error: 'Conflict',
          message: 'Room unavailable for selected dates',
        };
      }

      // Step 5: No overlap — INSERT the booking
      const nights = Math.ceil(
        (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
      );
      const totalPrice = parseFloat(room.price_per_night) * nights;

      const insertResult = await client.query(
        `INSERT INTO bookings (room_id, user_id, check_in, check_out, status, total_price)
         VALUES ($1, $2, $3, $4, 'CONFIRMED', $5)
         RETURNING id, room_id, user_id, check_in, check_out, status, total_price, created_at`,
        [roomId, userId, checkIn, checkOut, totalPrice]
      );

      await client.query('COMMIT');

      const booking = insertResult.rows[0];

      // Step 7: Invalidate cache for this room
      await invalidateCache(`room:${roomId}:*`);
      await invalidateCache('rooms:list:*');

      // Step 8: Fire-and-forget audit log
      logActivity({
        type: 'BOOKING_ATTEMPT',
        userId,
        userEmail,
        roomId,
        roomNumber: room.room_number,
        requestedRange: { checkIn, checkOut },
        outcome: 'CONFIRMED',
        details: `Booking ${booking.id} confirmed. Total: $${totalPrice}`,
      });

      return {
        success: true,
        statusCode: 201,
        data: {
          ...booking,
          room_number: room.room_number,
          price_per_night: room.price_per_night,
          total_nights: nights,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    // Log error to audit
    logActivity({
      type: 'BOOKING_ATTEMPT',
      userId,
      userEmail,
      roomId,
      requestedRange: { checkIn, checkOut },
      outcome: 'ERROR',
      details: err.message,
    });
    throw err;
  } finally {
    // Step 6: Always release the Redis lock
    if (lockToken) {
      await releaseLock(lockKey, lockToken);
    }
    // Always release the Postgres client back to the pool
    if (client) {
      client.release();
    }
  }
};

/**
 * Cancel a booking. Re-checks ownership and status.
 */
const cancelBooking = async ({ bookingId, userId, userEmail, isAdmin = false }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the booking row
    const bookingResult = await client.query(
      'SELECT b.id, b.room_id, b.user_id, b.check_in, b.check_out, b.status, r.room_number FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.id = $1 FOR UPDATE',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 404, error: 'NotFound', message: 'Booking not found' };
    }

    const booking = bookingResult.rows[0];

    // Ownership check (unless admin)
    if (!isAdmin && booking.user_id !== userId) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 403, error: 'Forbidden', message: 'You can only cancel your own bookings' };
    }

    if (booking.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 400, error: 'ValidationError', message: 'Only confirmed bookings can be cancelled' };
    }

    // BR-3: Can only cancel if check-in hasn't started
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.check_in);
    if (checkInDate <= today) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 400, error: 'ValidationError', message: 'Cannot cancel a booking that has already started' };
    }

    // Cancel it
    await client.query(
      "UPDATE bookings SET status = 'CANCELLED' WHERE id = $1",
      [bookingId]
    );
    await client.query('COMMIT');

    // Invalidate cache
    await invalidateCache(`room:${booking.room_id}:*`);
    await invalidateCache('rooms:list:*');

    // Audit log
    logActivity({
      type: 'BOOKING_CANCEL',
      userId,
      userEmail,
      roomId: booking.room_id,
      roomNumber: booking.room_number,
      requestedRange: { checkIn: booking.check_in, checkOut: booking.check_out },
      outcome: 'CANCELLED',
      details: `Booking ${bookingId} cancelled`,
    });

    return { success: true, statusCode: 200, data: { id: bookingId, status: 'CANCELLED' } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { createBooking, cancelBooking };
