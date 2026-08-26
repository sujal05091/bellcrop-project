import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { roomsAPI, bookingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './RoomDetailPage.css';

export default function RoomDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [available, setAvailable] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [booking, setBooking] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    fetchRoom();
  }, [id]);

  useEffect(() => {
    if (checkIn && checkOut && room) {
      checkAvailability();
    }
  }, [checkIn, checkOut, room]);

  const fetchRoom = async () => {
    try {
      const res = await roomsAPI.get(id);
      setRoom(res.data);
    } catch (err) {
      toast.error('Room not found');
      navigate('/rooms');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    setCheckingAvail(true);
    setConflict(false);
    try {
      const res = await roomsAPI.checkAvailability(id, checkIn, checkOut);
      setAvailable(res.data.available);
    } catch {
      setAvailable(null);
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to book a room');
      navigate('/login');
      return;
    }

    setBooking(true);
    setConflict(false);
    try {
      const res = await bookingsAPI.create({ roomId: parseInt(id), checkIn, checkOut });
      toast.success('Booking confirmed!');
      navigate(`/booking/confirmation/${res.data.booking.id}`);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(true);
        setAvailable(false);
        toast.error('These dates are no longer available');
      } else if (err.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Booking failed');
      }
    } finally {
      setBooking(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const nights = checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) : 0;
  const totalPrice = room ? (parseFloat(room.price_per_night) * nights).toFixed(2) : '0.00';

  const getRoomImage = (type) => {
    const images = {
      Standard: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
      Deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d955bc6ee?w=1200&q=80',
      Suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    };
    return images[type] || images.Standard;
  };

  if (loading) return <LoadingSpinner message="Loading room details..." />;
  if (!room) return null;

  return (
    <div className="room-detail-page">
      {/* Hero Image */}
      <div className="room-hero" style={{ backgroundImage: `url(${room.image_url || getRoomImage(room.type)})` }}>
        <div className="room-hero-overlay" />
      </div>

      <div className="container">
        <div className="room-detail-layout">
          {/* Left Column — Room Info */}
          <div className="room-info">
            <h1>{room.type} — Room {room.room_number}</h1>
            <p className="room-description">{room.description || 'A beautifully appointed room offering comfort and elegance for your stay.'}</p>

            <h4 style={{ marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>Amenities</h4>
            <div className="amenities-grid">
              {(room.amenities || ['WiFi', 'TV', 'Air Conditioning']).map((amenity, i) => (
                <div key={i} className="amenity-item">
                  <span className="amenity-icon">✦</span>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Booking Card */}
          <div className="booking-card-wrapper">
            <div className="booking-card">
              <h3 className="booking-card-price">
                ${room.price_per_night} <span className="small-caps">/ night</span>
              </h3>

              <hr className="divider" />

              <div className="form-group">
                <label htmlFor="detail-checkin">Check-in</label>
                <input
                  id="detail-checkin"
                  type="date"
                  className="form-input"
                  value={checkIn}
                  min={today}
                  onChange={(e) => { setCheckIn(e.target.value); setAvailable(null); setConflict(false); }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="detail-checkout">Check-out</label>
                <input
                  id="detail-checkout"
                  type="date"
                  className="form-input"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => { setCheckOut(e.target.value); setAvailable(null); setConflict(false); }}
                />
              </div>

              {/* Availability Badge */}
              {checkIn && checkOut && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  {checkingAvail ? (
                    <span className="badge badge-select">Checking...</span>
                  ) : available === true ? (
                    <span className="badge badge-available">● Available</span>
                  ) : available === false ? (
                    <span className="badge badge-unavailable">● Unavailable</span>
                  ) : null}
                </div>
              )}

              {/* Conflict Alert */}
              {conflict && (
                <div className="conflict-alert">
                  <strong>These dates are no longer available</strong>
                  <p>Someone just booked this room for the selected dates. Please choose different dates.</p>
                </div>
              )}

              {/* Price Breakdown */}
              {nights > 0 && available && (
                <div className="price-breakdown">
                  <hr className="divider" />
                  <div className="price-row">
                    <span>${room.price_per_night} × {nights} night{nights > 1 ? 's' : ''}</span>
                    <span>${totalPrice}</span>
                  </div>
                  <hr className="divider" />
                  <div className="price-row price-total">
                    <span>Total</span>
                    <span>${totalPrice}</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary booking-btn"
                disabled={!checkIn || !checkOut || !available || booking || conflict}
                onClick={handleBooking}
              >
                {booking ? 'Reserving...' : 'Reserve Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
