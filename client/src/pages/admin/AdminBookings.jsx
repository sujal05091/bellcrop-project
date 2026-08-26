import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteBookingId, setDeleteBookingId] = useState(null);
  const [deleteInfo, setDeleteInfo] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchBookings(1); }, [statusFilter]);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI.getAllBookings(params);
      setBookings(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteBookingId) return;
    setDeleting(true);
    try {
      await adminAPI.deleteBooking(deleteBookingId);
      toast.success('Booking deleted successfully');
      setDeleteBookingId(null);
      fetchBookings(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>All Bookings</h1>

      <div className="filter-chips">
        {['', 'CONFIRMED', 'CANCELLED'].map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Guest</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>Room {b.room_number}</td>
                    <td>{b.guest_email}</td>
                    <td>{new Date(b.check_in).toLocaleDateString()}</td>
                    <td>{new Date(b.check_out).toLocaleDateString()}</td>
                    <td><span className={`badge badge-${b.status === 'CONFIRMED' ? 'confirmed' : 'cancelled'}`}>{b.status}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{new Date(b.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}
                        onClick={() => {
                          setDeleteBookingId(b.id);
                          setDeleteInfo(`Room ${b.room_number} for ${b.guest_email}`);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-2xl)' }}>No bookings found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchBookings} />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteBookingId} onClose={() => setDeleteBookingId(null)} title="Delete Reservation">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Are you sure you want to permanently delete the reservation for <strong>{deleteInfo}</strong>? This will remove the booking from PostgreSQL and free up the room dates.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteBookingId(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Booking'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
