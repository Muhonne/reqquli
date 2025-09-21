import { useState, useEffect, useRef } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../atoms';
import { getTokenExpiration } from '../../lib/utils';
import { PasswordConfirmModal } from './PasswordConfirmModal';

export function UserSessionBox() {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [user, setUser] = useState<{ email: string; id: string; fullName?: string } | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const timerRef = useRef<HTMLDivElement | null>(null); // eslint-disable-line no-undef

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Failed to parse user data
      }
    }

    // Get token and extract real expiration time
    const token = localStorage.getItem('token');
    if (token) {
      const expiration = getTokenExpiration(token);
      if (expiration) {
        setSessionExpiresAt(expiration);
      } else {
        // Failed to extract token expiration
        // Fallback to logout if token is invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } else {
      // No token, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!sessionExpiresAt) {return;}

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = sessionExpiresAt.getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Session expired');
        // Auto logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      // Apply animation when less than 30 minutes remain
      const thirtyMinutesInMs = 30 * 60 * 1000;
      if (diff < thirtyMinutesInMs && diff > 0) {
        setIsAnimating(true);
      } else {
        setIsAnimating(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [sessionExpiresAt, navigate]);

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await axios.post('/api/auth/logout');
    } catch {
      // Logout error occurred
    } finally {
      // Clear local storage and redirect regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      navigate('/login');
    }
  };

  const handleRefreshSession = async (password: string) => {
    // Re-authenticate with current user's email and password
    const response = await axios.post('/api/auth/login', {
      email: user?.email,
      password
    });

    if (response.data.token) {
      // Update token in localStorage and axios headers
      localStorage.setItem('token', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      // Update session expiration
      const expiration = getTokenExpiration(response.data.token);
      if (expiration) {
        setSessionExpiresAt(expiration);
      }
    } else {
      throw new Error('Failed to refresh session');
    }
  };



  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || user?.email || 'Loading...'}</p>
        <Button
          onClick={handleLogout}
          variant="secondary"
          size="sm"
          className="p-1.5"
          title="Logout"
          testid="nav-logout"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <div
          ref={timerRef}
          className="relative"
          style={{
            display: 'inline-block',
          }}
        >
          <style>
            {`
              @keyframes pulseWarning {
                0%, 100% {
                  color: rgb(107 114 128);
                  transform: scale(1);
                }
                50% {
                  color: rgb(251 146 60);
                  transform: scale(1.05);
                }
              }

              .animate-pulse-warning {
                animation: pulseWarning 1.5s ease-in-out infinite;
                display: inline-block;
                transform-origin: left center;
              }
            `}
          </style>
          <span
            className={isAnimating ? 'animate-pulse-warning' : ''}
            onClick={() => setShowRefreshModal(true)}
            style={{ cursor: 'pointer' }}
            title="Click to refresh your session"
          >
            Session expires in {timeRemaining}
          </span>
        </div>
      </div>

      <PasswordConfirmModal
        isOpen={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onConfirm={handleRefreshSession}
        title="Refresh Session"
        message="Enter your password to extend your session for another 4 hours."
        confirmText="Refresh Session"
        loadingText="Refreshing..."
      />
    </div>
  );
}