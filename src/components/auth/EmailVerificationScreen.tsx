import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ThemeSelector } from '../ui/ThemeSelector';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface EmailVerificationScreenProps {
  email: string;
  onBack: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { resendVerification } = useAuth();

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await resendVerification(email);
      if (error) {
        setError(error.message);
      } else {
        setMessage('Verification email sent successfully! Please check your inbox.');
      }
    } catch (error: any) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <ThemeSelector showLabels={false} size="sm" />
        </div>
        
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Check your email</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            We've sent a verification link to
          </p>
          <p className="font-medium text-blue-600 dark:text-blue-400 mt-1">
            {email}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 transition-colors duration-300 space-y-6">
          {message && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                What's next?
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Check your inbox (and spam folder)</li>
                <li>• Click the verification link in the email</li>
                <li>• You'll be automatically signed in</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={loading}
                variant="secondary"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>

              <Button
                onClick={onBack}
                variant="ghost"
                className="w-full"
              >
                Back to sign in
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The verification link will expire in 24 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};