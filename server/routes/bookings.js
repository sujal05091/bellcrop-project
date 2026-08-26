const express = require('express');
const router = express.Router();
const { create, getMyBookings, cancel, getBooking } = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBookingSchema } = require('../validators/schemas');
const { bookingRateLimiter } = require('../middleware/rateLimiter');

// All booking routes require authentication
router.use(authenticate);

router.post('/', bookingRateLimiter, validate(createBookingSchema), create);
router.get('/me', getMyBookings);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancel);

module.exports = router;
