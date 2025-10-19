// LoginForm component with validation
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ProfileEditModal } from '../Profile/ProfileEditModal';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup }) => {
  const { signIn, signInWithGoogle, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const validateForm = (): boolean => {
    if (!email) {
      setValidationError('Email is required');
      return false;
    }
    if (!email.includes('@')) {
      setValidationError('Please enter a valid email');
      return false;
    }
    if (!password) {
      setValidationError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await signIn(email, password);
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { needsProfileCompletion } = await signInWithGoogle();
      if (needsProfileCompletion) {
        setShowProfileModal(true);
      }
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  return (
    <>
      {showProfileModal && (
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          required={true}
        />
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Sign In</h2>
          <p className="text-gray-600 text-sm">Welcome back to CollabCanvas</p>
        </div>

      {(validationError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {validationError || error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800 placeholder-gray-400"
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-gray-800 placeholder-gray-400"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500 font-medium">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full bg-white text-gray-700 py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>

      <div className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
        >
          Sign up
        </button>
      </div>
    </form>
    </>
  );
};

