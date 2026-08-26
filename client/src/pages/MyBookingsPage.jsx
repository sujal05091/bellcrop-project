import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import './MyBookingsPage.css';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookings(1);
  }, [activeTab]);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const res = await bookingsAPI.getMyBookings({ page, limit: 10, status: activeTab });
      setBookings(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await bookingsAPI.cancel(cancelId);
      toast.success('Booking cancelled');
      setCancelId(null);
      fetchBookings(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const getRoomImage = (type) => {
    const images = {
      Standard: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=300&q=80',
      Deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d955bc6ee?w=300&q=80',
      Suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=300&q=80',
    };
    return images[type] || images.Standard;
  };

  const tabs = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="container page-content">
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>My Trips</h1>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading your trips..." />
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <h3>Your next stay awaits</h3>
          <p>{activeTab === 'upcoming' ? "You don't have any upcoming trips." : "No bookings in this category."}</p>
          <Link to="/rooms" className="btn btn-primary">Browse Rooms</Link>
        </div>
      ) : (
        <>
          <div className="bookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="booking-card-row card">
                <div className="booking-thumb" style={{ backgroundImage: `url(${b.image_url || getRoomImage(b.type)})` }} />
                <div className="booking-info">
                  <h3>{b.type} — Room {b.room_number}</h3>
                  <p className="booking-dates">
                    {new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(b.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="booking-meta">
                    <span className={`badge badge-${b.status === 'CONFIRMED' ? 'confirmed' : 'cancelled'}`}>{b.status}</span>
                    {b.total_price && <span className="small-caps">${b.total_price}</span>}
                  </div>
                </div>
                <div className="booking-actions">
                  {b.status === 'CONFIRMED' && new Date(b.check_in) > new Date() && (
                    <button className="cancel-link" onClick={() => setCancelId(b.id)}>Cancel Reservation</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => fetchBookings(p)} />
        </>
      )}

      {/* Cancel Modal */}
      <Modal isOpen={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Reservation">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Are you sure you want to cancel this reservation? This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setCancelId(null)}>Keep Reservation</button>
          <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
