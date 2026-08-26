const express = require('express');
const router = express.Router();
const { getAllBookings, getActivityLogs, getDashboardStats, getAllRooms, getAllUsers, deleteUser, deleteBooking } = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/rooms', getAllRooms);
router.get('/bookings', getAllBookings);
router.delete('/bookings/:id', deleteBooking);
router.get('/logs', getActivityLogs);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

module.exports = router;
