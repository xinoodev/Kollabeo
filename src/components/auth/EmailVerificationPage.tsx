import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeSelector } from '../ui/ThemeSelector';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmailVerificationPageProps {
  token: string;
}

export const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ token }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { verifyEmail } = useAuth();

  useEffect(() => {
    const verify = async () => {
      try {
        const { error } = await verifyEmail(token);
        if (error) {
          setStatus('error');
          setMessage(error.message);
        } else {
          setStatus('success');
          setMessage('Your email has been verified successfully! You will be redirected to your dashboard.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage('Failed to verify email. The link may be invalid or expired.');
      }
    };

    if (token) {
      verify();
    } else {
      setStatus('error');
      setMessage('Invalid verification link.');
    }
  }, [token, verifyEmail]);

  const handleGoToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <ThemeSelector showLabels={false} size="sm" />
        </div>
        
        <div className="text-center">
          <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 ${
            status === 'loading' 
              ? 'bg-blue-100 dark:bg-blue-900/20' 
              : status === 'success'
              ? 'bg-green-100 dark:bg-green-900/20'
              : 'bg-red-100 dark:bg-red-900/20'
          }`}>
            {status === 'loading' && <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />}
            {status === 'error' && <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email verified!'}
            {status === 'error' && 'Verification failed'}
          </h2>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 transition-colors duration-300">
          <div className={`p-4 rounded-lg flex items-start space-x-3 ${
            status === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : status === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {status === 'loading' && <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
              {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${
                status === 'success' 
                  ? 'text-green-700 dark:text-green-300'
                  : status === 'error'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {message}
              </p>
            </div>
          </div>

          {status === 'success' && (
            <div className="mt-6">
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6">
              <Button onClick={() => window.location.href = '/'} variant="secondary" className="w-full">
                Back to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};