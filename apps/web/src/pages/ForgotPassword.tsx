import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage('If an account exists with this email, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8">
        <h1 className="text-2xl font-bold text-text mb-2">Forgot Password</h1>
        <p className="text-text-muted text-sm mb-6">Enter your email to receive a reset link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            required
            autoComplete="email"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-primary text-[#0A1628] rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <Link to="/login" className="block text-center text-sm text-primary mt-4">Back to Login</Link>
      </div>
    </div>
  );
}
