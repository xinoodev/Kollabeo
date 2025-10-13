import React, { useState } from 'react';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { EmailVerificationPage } from './EmailVerificationPage';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ThemeSelector } from '../ui/ThemeSelector';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export const AuthForm: React.FC = () => {
  // Check if we're on the verification page
  const urlParams = new URLSearchParams(window.location.search);
  const verificationToken = urlParams.get('token');
  
  if (verificationToken) {
    return <EmailVerificationPage token={verificationToken} />;
  }

  const { user } = useAuth();
  
  // If user exists but is not verified, show verification screen
  if (user && !user.email_verified) {
    return (
      <EmailVerificationScreen 
        email={user.email} 
        onBack={() => {
          // Sign out the user to allow them to try with different email
          const { signOut } = useAuth();
          signOut();
        }} 
      />
    );
  }
  const [isLogin, setIsLogin] = useState(true);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  if (showVerificationScreen) {
    return (
      <EmailVerificationScreen 
        email={registeredEmail} 
        onBack={() => {
          setShowVerificationScreen(false);
          setRegisteredEmail('');
        }} 
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) {
          if (data?.requiresVerification) {
            setRegisteredEmail(data.email || email);
            setShowVerificationScreen(true);
            return;
          }
          throw error;
        }
      } else {
        const { data, error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        if (data?.requiresVerification) {
          setRegisteredEmail(email);
          setShowVerificationScreen(true);
          return;
        }
      }
    } catch (error: any) {
      setError(error.message);
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
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Kollabeo</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border dark:border-gray-700 transition-colors duration-300" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            )}
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {isLogin ? (
                  <LogIn className="mr-2 h-4 w-4" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {isLogin ? 'Sign In' : 'Sign Up'}
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-medium transition-colors duration-200"
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};