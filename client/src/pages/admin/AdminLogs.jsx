import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import Pagination from '../../components/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [outcomeFilter, setOutcomeFilter] = useState('');

  useEffect(() => { fetchLogs(1); }, [outcomeFilter]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (outcomeFilter) params.outcome = outcomeFilter;
      const res = await adminAPI.getLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load activity logs'); }
    finally { setLoading(false); }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'CONFIRMED': return <span className="badge badge-confirmed">Confirmed</span>;
      case 'CONFLICT': return <span className="badge badge-conflict">Conflict</span>;
      case 'CANCELLED': return <span className="badge badge-cancelled">Cancelled</span>;
      case 'ERROR': return <span className="badge badge-pending">Error</span>;
      default: return <span className="badge badge-select">{outcome}</span>;
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Activity Logs</h1>

      <div className="filter-chips">
        {['', 'CONFIRMED', 'CONFLICT', 'CANCELLED', 'ERROR'].map((s) => (
          <button key={s} className={`chip ${outcomeFilter === s ? 'active' : ''}`} onClick={() => setOutcomeFilter(s)}>
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
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Room</th>
                  <th>Action</th>
                  <th>Outcome</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>{log.userEmail || log.userId?.slice(0, 8)}</td>
                    <td>{log.roomNumber || `#${log.roomId}`}</td>
                    <td className="small-caps">{log.type}</td>
                    <td>{getOutcomeBadge(log.outcome)}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-2xl)' }}>No activity logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchLogs} />
        </>
      )}
    </div>
  );
}
