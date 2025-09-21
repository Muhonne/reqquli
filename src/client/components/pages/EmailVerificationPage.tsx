import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { Spinner } from '../atoms/Spinner';

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await axios.get(`/api/auth/verify-email/${verificationToken}`);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || 'Your email has been verified successfully!');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 
        'An error occurred during verification. Please try again or contact support.'
      );
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow">
        <div className="text-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reqquli</h1>
            <p className="text-sm text-gray-600 mt-2">Requirements Management System</p>
          </div>
          
          <div className="mt-8 space-y-4">
            {status === 'loading' && (
              <>
                <Spinner testid="email-verification-spinner" />
                <Text className="text-gray-600" testid="email-verification-loading">Verifying your email address...</Text>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div className="text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Text className="text-lg font-semibold text-green-800" testid="email-verification-success-title">Email Verified!</Text>
                <Text className="text-gray-600" testid="email-verification-message">{message}</Text>
                <Button
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="lg"
                  className="w-full mt-6"
                  testid="email-verification-success-login"
                >
                  Go to Login
                </Button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div className="text-red-600">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Text className="text-lg font-semibold text-red-800" testid="email-verification-error-title">Verification Failed</Text>
                <Text className="text-gray-600" testid="email-verification-message">{message}</Text>
                <div className="space-y-2 mt-6">
                  <Button
                    onClick={() => navigate('/login')}
                    variant="primary"
                    className="w-full"
                    testid="email-verification-error-login"
                  >
                    Go to Login
                  </Button>
                  <Button
                    onClick={() => navigate('/register')}
                    variant="secondary"
                    className="w-full"
                    testid="email-verification-error-register"
                  >
                    Create New Account
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}