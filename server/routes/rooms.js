const express = require('express');
const router = express.Router();
const { listRooms, getRoom, checkAvailability, createRoom, updateRoom } = require('../controllers/roomController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRoomSchema, updateRoomSchema } = require('../validators/schemas');

// Public routes (auth optional for room browsing)
router.get('/', listRooms);
router.get('/:id', getRoom);
router.get('/:id/availability', checkAvailability);

// Admin-only routes
router.post('/', authenticate, requireAdmin, validate(createRoomSchema), createRoom);
router.patch('/:id', authenticate, requireAdmin, validate(updateRoomSchema), updateRoom);

module.exports = router;
