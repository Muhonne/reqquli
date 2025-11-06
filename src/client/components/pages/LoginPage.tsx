import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
// @ts-ignore - Vite handles JSON imports
import { version } from '../../../../package.json';

export function LoginPage() {
  const navigate = useNavigate();

  // Build info - set at build time via Vite
  const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
  const gitCommit = import.meta.env.VITE_GIT_COMMIT || 'dev';
  const gitBranch = import.meta.env.VITE_GIT_BRANCH || 'local';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set default auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Redirect to main page
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      
      // Check if error is due to unverified email
      if (errorMessage.toLowerCase().includes('verify your email')) {
        setShowResendVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      await axios.post('/api/auth/resend-verification', { email });
      setResendSuccess(true);
      setShowResendVerification(false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Reqquli</h1>
          <p className="text-sm text-gray-600 mt-2">Requirements Management System</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="mt-1"
                testid="login-email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="mt-1"
                testid="login-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4">
              <Text className="text-sm text-red-800" testid="login-error-message">{error}</Text>
              {showResendVerification && (
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={handleResendVerification}
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    testid="login-resend-verification"
                  >
                    Resend Verification Email
                  </Button>
                </div>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="bg-green-50 p-4">
              <Text className="text-sm text-green-800" testid="login-resend-success">
                Verification email sent successfully. Please check your inbox.
              </Text>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full"
              testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center">
            <Text className="text-sm text-gray-600" testid="login-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500" data-testid="login-signup-link">
                Sign up
              </Link>
            </Text>
          </div>
        </form>

        {/* Version info */}
        <div className="text-center mt-8 space-y-1">
          <Text variant="caption" color="secondary">
            v{version} • {gitBranch}@{gitCommit}
          </Text>
          <Text variant="caption" color="secondary">
            Built: {buildTime.replace('T', ' ').split('.')[0]}
          </Text>
        </div>
      </div>
    </main>
  );
}