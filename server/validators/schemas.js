const { z } = require('zod');

// Auth schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Room schemas
const createRoomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required'),
  type: z.string().min(1, 'Room type is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  price_per_night: z.number().positive('Price must be positive'),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  image_url: z.string().optional(),
});

const updateRoomSchema = z.object({
  room_number: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  price_per_night: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  image_url: z.string().optional(),
});

// Booking schemas
const createBookingSchema = z.object({
  roomId: z.number().int().positive('Room ID must be a positive integer'),
  checkIn: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Check-in must be a valid date'),
  checkOut: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Check-out must be a valid date'),
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: 'Check-out must be after check-in',
  path: ['checkOut'],
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return checkIn >= today;
}, {
  message: 'Check-in date cannot be in the past',
  path: ['checkIn'],
});

module.exports = {
  registerSchema,
  loginSchema,
  createRoomSchema,
  updateRoomSchema,
  createBookingSchema,
};
