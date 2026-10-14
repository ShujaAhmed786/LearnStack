import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Layers, AlertCircle } from 'lucide-react';
import { ApiRequestError } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show a notice when redirected here after a stale session (e.g. the
  // user's organization changed server-side and the old session was cleared).
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem('session_expired_message');
      if (msg) {
        sessionStorage.removeItem('session_expired_message');
        setError(msg);
      }
    } catch {
      // storage unavailable; ignore
    }
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
          setIsUnverified(true);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-bg relative transition-colors">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-primary mb-3">
            <Layers size={24} />
          </div>
          <h1 className="text-24 font-semibold text-text tracking-tight">
            Sign in to LearnStack
          </h1>
          <p className="text-14 text-text-muted mt-1 text-center">
            Enter your credentials to access your dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="w-full">

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg flex flex-col gap-2 text-danger text-14">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {isUnverified && (
                  <div className="pt-2 border-t border-danger/20 flex items-center justify-between">
                    <span className="text-12 text-text-muted">Need to verify?</span>
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(email)}`}
                      className="text-13 text-primary hover:underline font-medium"
                    >
                      Verify Email &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-13 text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer Link */}
        <p className="text-14 text-text-muted text-center mt-6">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
