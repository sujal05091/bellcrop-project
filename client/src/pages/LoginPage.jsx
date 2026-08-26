import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (isRegister && password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/rooms');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.details?.[0]?.message || 'Something went wrong';
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-image">
        <div className="login-image-overlay" />
      </div>
      <div className="login-form-side">
        <div className="login-form-container">
          <h1>{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="login-subtitle">
            {isRegister ? 'Join BellCrop for exclusive stays' : 'Sign in to manage your reservations'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            {isRegister && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
              </div>
            )}

            {errors.submit && <p className="form-error" style={{ marginBottom: 'var(--space-md)' }}>{errors.submit}</p>}

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="login-toggle">
            <p>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="toggle-link"
                onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
