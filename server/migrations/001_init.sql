-- BellCrop Hotel Booking System - Initial Schema
-- PostgreSQL 16

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  room_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_per_night NUMERIC(10, 2) NOT NULL CHECK (price_per_night > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  description TEXT,
  amenities TEXT[] DEFAULT '{}'
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id UUID NOT NULL REFERENCES users(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  total_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- Partial index for overlap checks: only CONFIRMED bookings matter
CREATE INDEX idx_bookings_room_dates 
  ON bookings(room_id, check_in, check_out) 
  WHERE status = 'CONFIRMED';

-- Index for user's own bookings
CREATE INDEX idx_bookings_user ON bookings(user_id);

-- Index for room lookups
CREATE INDEX idx_rooms_active ON rooms(is_active);

-- Seed an admin user (password: admin123 — bcrypt hash)
-- $2b$10$8KzQx3BlkGZKBFQmLQh05uYxFg6v5VhVZY9eQoW1VkYqKzQFrGqy2
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@bellcrop.com', '$2b$10$daBr.A.sOe1jp8IfdOz1hu4W40H1wPlHU/FnfcaxFMZ6pEqCtJVQG', 'admin');

-- Seed sample rooms matching Stitch design specifications
INSERT INTO rooms (room_number, type, capacity, price_per_night, description, amenities, image_url) VALUES
  ('101', 'Garden Terrace Room', 2, 150.00, 'A cozy room featuring a private outdoor space with lush greenery, mid-century modern furniture, and warm morning light.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Coffee Maker', 'Terrace'], 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'),
  ('102', 'Standard King', 2, 180.00, 'Comfortable standard room featuring contemporary decor and plush bedding.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Coffee Maker'], 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80'),
  ('201', 'Junior Suite', 3, 280.00, 'Minimalist luxury suite with warm tones, high-end textures, soft natural lighting, and plush seating area.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'King Bed', 'Bathrobe'], 'https://images.unsplash.com/photo-1590490360182-c33d955bc6ee?w=800&q=80'),
  ('202', 'Deluxe King', 3, 310.00, 'Elegant deluxe room offering refined luxury and exceptional comfort.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'King Bed', 'Bathrobe'], 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'),
  ('301', 'Grand Deluxe Suite', 4, 450.00, 'The Grand Suite — an expansive retreat with panoramic city views, separate living lounge, and bespoke amenities.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'King Bed', 'Bathrobe', 'Room Service', 'City View', 'Jacuzzi'], 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'),
  ('302', 'Presidential Suite', 4, 550.00, 'Premium suite with opulent interiors, a private balcony, and butler service.', ARRAY['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'King Bed', 'Bathrobe', 'Room Service', 'City View', 'Balcony'], 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80');
