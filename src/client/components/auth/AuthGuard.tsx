import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  return <>{children}</>;
}