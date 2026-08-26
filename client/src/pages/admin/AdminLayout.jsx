import { NavLink, Outlet } from 'react-router-dom';
import { FiGrid, FiHome, FiCalendar, FiActivity, FiUsers, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>
              <FiGrid size={18} /> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/rooms" className={({ isActive }) => isActive ? 'active' : ''}>
              <FiHome size={18} /> Rooms
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
              <FiCalendar size={18} /> All Bookings
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
              <FiUsers size={18} /> Users
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/logs" className={({ isActive }) => isActive ? 'active' : ''}>
              <FiActivity size={18} /> Activity Logs
            </NavLink>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <FiLogOut size={18} /> Logout
            </a>
          </li>
        </ul>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
