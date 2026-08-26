import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <Link to="/" className="navbar-brand">
        LUMINOIRE
      </Link>

      <ul className="navbar-links">
        <li>
          <Link to="/rooms" className={isActive('/rooms') ? 'active' : ''}>
            Rooms
          </Link>
        </li>
        {isAuthenticated && !isAdmin && (
          <li>
            <Link to="/my-bookings" className={isActive('/my-bookings') ? 'active' : ''}>
              My Trips
            </Link>
          </li>
        )}
        {isAdmin && (
          <li>
            <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>
              Dashboard
            </Link>
          </li>
        )}
      </ul>

      <div className="navbar-actions">
        {isAuthenticated ? (
          <button onClick={handleLogout} className="btn-ghost nav-sign-in">
            Logout
          </button>
        ) : (
          <Link to="/login" className="nav-sign-in">
            Sign In
          </Link>
        )}
        <Link to="/rooms" className="btn-book-now">
          Book Now
        </Link>
      </div>
    </nav>
  );
}
