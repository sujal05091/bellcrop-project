import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllBookings({ page: 1, limit: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentBookings(bookingsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Dashboard</h1>

      {stats && (
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-value">{stats.totalRooms}</div>
            <div className="stat-label">Total Rooms</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.activeBookings}</div>
            <div className="stat-label">Active Bookings</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.occupancyRate}%</div>
            <div className="stat-label">Occupancy Rate</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.totalBookings}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Bookings</h3>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Guest</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b.id}>
                <td>Room {b.room_number}</td>
                <td>{b.guest_email}</td>
                <td>{new Date(b.check_in).toLocaleDateString()}</td>
                <td>{new Date(b.check_out).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-${b.status === 'CONFIRMED' ? 'confirmed' : 'cancelled'}`}>{b.status}</span>
                </td>
              </tr>
            ))}
            {recentBookings.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No bookings yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
