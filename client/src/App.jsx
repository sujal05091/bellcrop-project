import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RoomListPage from './pages/RoomListPage';
import RoomDetailPage from './pages/RoomDetailPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import MyBookingsPage from './pages/MyBookingsPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRooms from './pages/admin/AdminRooms';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLogs from './pages/admin/AdminLogs';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-sans)',
              borderRadius: '8px',
              background: '#fff',
              color: 'var(--color-text)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            },
          }}
        />
        <Routes>
          {/* Auth routes (no navbar) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />

          {/* Guest routes (with navbar) */}
          <Route path="/" element={<><Navbar /><Navigate to="/rooms" replace /></>} />
          <Route path="/rooms" element={<><Navbar /><RoomListPage /></>} />
          <Route path="/rooms/:id" element={<><Navbar /><RoomDetailPage /></>} />
          <Route path="/booking/confirmation/:id" element={
            <ProtectedRoute><Navbar /><BookingConfirmationPage /></ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute><Navbar /><MyBookingsPage /></ProtectedRoute>
          } />

          {/* Admin routes (with navbar + sidebar) */}
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><Navbar /><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="logs" element={<AdminLogs />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/rooms" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
