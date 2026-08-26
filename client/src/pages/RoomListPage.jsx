import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roomsAPI } from '../services/api';
import Pagination from '../components/Pagination';
import { SkeletonCard } from '../components/LoadingSpinner';
import { FiCalendar, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './RoomListPage.css';

export default function RoomListPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [guests, setGuests] = useState('2');
  const [availability, setAvailability] = useState({});

  const page = parseInt(searchParams.get('page')) || 1;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchRooms();
  }, [page]);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await roomsAPI.list({ page, limit: 10 });
      setRooms(res.data.data);
      setPagination(res.data.pagination);

      // If dates already in URL, check availability
      const urlCheckIn = searchParams.get('checkIn');
      const urlCheckOut = searchParams.get('checkOut');
      if (urlCheckIn && urlCheckOut) {
        checkAllAvailability(res.data.data, urlCheckIn, urlCheckOut);
      }
    } catch (err) {
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkAllAvailability = async (roomList, inDate, outDate) => {
    const avail = {};
    await Promise.all(
      roomList.map(async (room) => {
        try {
          const res = await roomsAPI.checkAvailability(room.id, inDate, outDate);
          avail[room.id] = res.data.available;
        } catch {
          avail[room.id] = null;
        }
      })
    );
    setAvailability(avail);
  };

  const handleSearch = async (e) => {
    e?.preventDefault();

    let targetIn = checkIn;
    let targetOut = checkOut;

    // Auto-fill dates if empty
    if (!targetIn) {
      targetIn = today;
      setCheckIn(today);
    }
    if (!targetOut) {
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 2);
      targetOut = nextDay.toISOString().split('T')[0];
      setCheckOut(targetOut);
    }

    if (targetIn >= targetOut) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    setSearching(true);
    setSearchParams({ checkIn: targetIn, checkOut: targetOut, guests, page: '1' });

    await checkAllAvailability(rooms, targetIn, targetOut);
    setSearching(false);
    toast.success('Availability updated!');

    // Smooth scroll down to rooms section
    document.querySelector('.rooms-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAvailabilityBadge = (roomId) => {
    if (!checkIn || !checkOut) return <span className="badge badge-select">Select Dates</span>;
    if (availability[roomId] === undefined) return <span className="badge badge-select">Select Dates</span>;
    if (availability[roomId] === true) return <span className="badge badge-available">● Available</span>;
    if (availability[roomId] === false) return <span className="badge badge-unavailable">● Unavailable</span>;
    return <span className="badge badge-select">Check Availability</span>;
  };

  const getRoomImage = (type) => {
    const images = {
      'Garden Terrace Room': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      Standard: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
      'Junior Suite': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
      Deluxe: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
      Suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
      'Grand Deluxe Suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    };
    return images[type] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80';
  };

  return (
    <div className="rooms-page">
      {/* Hero Banner */}
      <div className="rooms-hero">
        <div className="rooms-hero-overlay" />
        <div className="rooms-hero-content">
          <h1 className="hero-title">Find Your Stay</h1>

          {/* Floating Search Bar */}
          <form className="hero-search-card" onSubmit={handleSearch}>
            <div className="search-field">
              <label htmlFor="hero-checkin">
                <FiCalendar className="field-icon" /> Check-in
              </label>
              <input
                id="hero-checkin"
                type="date"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="field-divider" />

            <div className="search-field">
              <label htmlFor="hero-checkout">
                <FiCalendar className="field-icon" /> Check-out
              </label>
              <input
                id="hero-checkout"
                type="date"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="field-divider" />

            <div className="search-field">
              <label htmlFor="hero-guests">
                <FiUser className="field-icon" /> Guests
              </label>
              <select
                id="hero-guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="search-input search-select"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
              </select>
            </div>

            <button type="submit" className="btn-check-avail" disabled={searching}>
              {searching ? 'Checking...' : 'Check Availability'}
            </button>
          </form>
        </div>
      </div>

      {/* Room Grid — 2 Column Layout with Descriptions */}
      <div className="container">
        <div className="rooms-section">
          {error && (
            <div className="empty-state">
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button onClick={fetchRooms} className="btn btn-secondary">Try Again</button>
            </div>
          )}

          {loading ? (
            <div className="rooms-grid">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <h3>No rooms available</h3>
              <p>Try adjusting your dates or check back later.</p>
            </div>
          ) : (
            <>
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <Link to={`/rooms/${room.id}${checkIn ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ''}`} key={room.id} className="room-card card">
                    <div className="room-card-image" style={{ backgroundImage: `url(${room.image_url || getRoomImage(room.type)})` }} />
                    <div className="room-card-body">
                      <h3 className="room-card-name">{room.type} — {room.room_number}</h3>
                      <div className="room-card-meta">
                        <span className="small-caps">{room.capacity} Guests</span>
                        <span className="small-caps">${room.price_per_night} / Night</span>
                      </div>
                      {room.description && (
                        <p className="room-card-description">{room.description}</p>
                      )}
                      {getAvailabilityBadge(room.id)}
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination page={page} totalPages={pagination.totalPages} onPageChange={(p) => setSearchParams({ checkIn, checkOut, page: String(p) })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
