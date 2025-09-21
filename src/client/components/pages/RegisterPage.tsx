import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await axios.post('/api/auth/register', {
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password
      });

      setSuccess(true);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white shadow">
          <div className="text-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reqquli</h1>
              <p className="text-sm text-gray-600 mt-2">Requirements Management System</p>
            </div>
            <div className="mt-8 space-y-4">
              <div className="text-green-600">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Text className="text-lg font-semibold" testid="register-success-title">Registration Successful!</Text>
              <Text className="text-gray-600" testid="register-success-message">
                Please check your email to verify your account. You will receive a verification link shortly.
              </Text>
              <Button
                onClick={() => navigate('/login')}
                variant="primary"
                className="w-full mt-4"
                testid="register-success-login"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Reqquli</h1>
            <p className="text-sm text-gray-600 mt-2">Requirements Management System</p>
          </div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
            Create your account
          </h2>
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
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                placeholder="user@example.com"
                className="mt-1"
                testid="register-email"
              />
              {errors.email && (
                <Text className="mt-1 text-sm text-red-600">{errors.email}</Text>
              )}
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={formData.fullName}
                onChange={handleChange('fullName')}
                error={!!errors.fullName}
                placeholder="John Doe"
                className="mt-1"
                testid="register-name"
              />
              {errors.fullName && (
                <Text className="mt-1 text-sm text-red-600">{errors.fullName}</Text>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange('password')}
                error={!!errors.password}
                placeholder="Enter password"
                className="mt-1"
                testid="register-password"
              />
              {errors.password && (
                <Text className="mt-1 text-sm text-red-600">{errors.password}</Text>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                error={!!errors.confirmPassword}
                placeholder="Confirm password"
                className="mt-1"
                testid="register-confirm-password"
              />
              {errors.confirmPassword && (
                <Text className="mt-1 text-sm text-red-600">{errors.confirmPassword}</Text>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-50 p-4">
              <Text className="text-sm text-red-800">{errors.general}</Text>
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full"
              testid="register-submit"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </div>

          <div className="text-center">
            <Text className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500" data-testid="register-login-link">
                Sign in
              </Link>
            </Text>
          </div>
        </form>
      </div>
    </main>
  );
}