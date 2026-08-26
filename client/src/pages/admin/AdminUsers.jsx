import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllUsers({ page, limit: 20 });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setDeleting(true);
    try {
      await adminAPI.deleteUser(deleteUserId);
      toast.success(`User ${deleteEmail} deleted successfully`);
      setDeleteUserId(null);
      fetchUsers(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Manage Users</h1>

      {loading ? (
        <LoadingSpinner message="Loading users..." />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.email} {u.id === currentUser?.id && <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem' }}>(You)</span>}
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-confirmed' : 'badge-select'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      {u.id === currentUser?.id ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Active Admin</span>
                      ) : (
                        <button
                          className="btn-ghost"
                          style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}
                          onClick={() => {
                            setDeleteUserId(u.id);
                            setDeleteEmail(u.email);
                          }}
                        >
                          Delete User
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-2xl)' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchUsers} />
        </>
      )}

      {/* Delete User Modal */}
      <Modal isOpen={!!deleteUserId} onClose={() => setDeleteUserId(null)} title="Delete User Account">
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Are you sure you want to permanently delete the account for <strong>{deleteEmail}</strong>? This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setDeleteUserId(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
