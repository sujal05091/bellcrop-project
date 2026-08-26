import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './BookingConfirmationPage.css';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const res = await bookingsAPI.get(id);
      setBooking(res.data);
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your booking..." />;
  if (!booking) return (
    <div className="empty-state">
      <h3>Booking not found</h3>
      <Link to="/rooms" className="btn btn-primary">Browse Rooms</Link>
    </div>
  );

  const nights = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));

  const getRoomImage = (type) => {
    const images = {
      Standard: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
      Deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d955bc6ee?w=1200&q=80',
      Suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    };
    return images[type] || images.Standard;
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-hero" style={{ backgroundImage: `url(${booking.image_url || getRoomImage(booking.type)})` }}>
        <div className="confirmation-hero-overlay" />
      </div>

      <div className="confirmation-card">
        <div className="confirmation-checkmark">✓</div>
        <h1>Your Stay is Confirmed</h1>

        <div className="confirmation-details">
          <div className="confirmation-row">
            <span className="small-caps">Room</span>
            <span>{booking.type} — Room {booking.room_number}</span>
          </div>
          <hr className="divider" />
          <div className="confirmation-row">
            <span className="small-caps">Check-in</span>
            <span>{new Date(booking.check_in).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <hr className="divider" />
          <div className="confirmation-row">
            <span className="small-caps">Check-out</span>
            <span>{new Date(booking.check_out).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <hr className="divider" />
          <div className="confirmation-row">
            <span className="small-caps">Duration</span>
            <span>{nights} night{nights > 1 ? 's' : ''}</span>
          </div>
          <hr className="divider" />
          <div className="confirmation-row">
            <span className="small-caps">Total</span>
            <span style={{ fontWeight: 700 }}>${booking.total_price}</span>
          </div>
          <hr className="divider" />
          <div className="confirmation-row">
            <span className="small-caps">Status</span>
            <span className="badge badge-confirmed">Confirmed</span>
          </div>
        </div>

        <Link to="/my-bookings" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-xl)' }}>
          View My Trips
        </Link>
      </div>
    </div>
  );
}
