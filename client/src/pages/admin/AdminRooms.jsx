import { useState, useEffect } from 'react';
import { adminAPI, roomsAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState({ room_number: '', type: 'Standard', capacity: 2, price_per_night: 150 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllRooms({ page, limit: 20 });
      setRooms(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load rooms'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRoom) {
        await roomsAPI.update(editRoom.id, { ...form, capacity: parseInt(form.capacity), price_per_night: parseFloat(form.price_per_night) });
        toast.success('Room updated');
      } else {
        await roomsAPI.create({ ...form, capacity: parseInt(form.capacity), price_per_night: parseFloat(form.price_per_night) });
        toast.success('Room created');
      }
      setShowModal(false);
      setEditRoom(null);
      setForm({ room_number: '', type: 'Standard', capacity: 2, price_per_night: 150 });
      fetchRooms(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save room');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (room) => {
    setEditRoom(room);
    setForm({ room_number: room.room_number, type: room.type, capacity: room.capacity, price_per_night: room.price_per_night });
    setShowModal(true);
  };

  const handleDeactivate = async (room) => {
    try {
      await roomsAPI.update(room.id, { is_active: !room.is_active });
      toast.success(room.is_active ? 'Room deactivated' : 'Room activated');
      fetchRooms(pagination.page);
    } catch { toast.error('Failed to update room'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <h1>Manage Rooms</h1>
        <button className="btn btn-primary" onClick={() => { setEditRoom(null); setForm({ room_number: '', type: 'Standard', capacity: 2, price_per_night: 150 }); setShowModal(true); }}>
          + Add Room
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Price/Night</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.room_number}</td>
                <td>{r.type}</td>
                <td>{r.capacity}</td>
                <td>${r.price_per_night}</td>
                <td>
                  <span className={`badge ${r.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn-ghost" onClick={() => handleEdit(r)} style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>Edit</button>
                  <button className="btn-ghost" onClick={() => handleDeactivate(r)} style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>
                    {r.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchRooms} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editRoom ? 'Edit Room' : 'Add Room'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="room-number">Room Number</label>
            <input id="room-number" className="form-input" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="room-type">Type</label>
            <select id="room-type" className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ borderBottom: '1.5px solid var(--color-border)', background: 'transparent' }}>
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="room-capacity">Capacity</label>
            <input id="room-capacity" type="number" className="form-input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} min="1" required />
          </div>
          <div className="form-group">
            <label htmlFor="room-price">Price per Night ($)</label>
            <input id="room-price" type="number" className="form-input" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: e.target.value })} min="1" step="0.01" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Room'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
