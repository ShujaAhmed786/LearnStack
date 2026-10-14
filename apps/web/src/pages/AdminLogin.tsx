import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { ApiRequestError } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await login(email, password);
      const user = response.user;

      if (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
        // Clear session since user is not an admin
        await logout();
        setError('Access denied. Administrator privileges (ORG_ADMIN or SUPER_ADMIN) are required.');
        return;
      }

      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email before logging into Admin Console.');
        } else if (err.code === 'ACCOUNT_DEACTIVATED') {
          setError('This account has been deactivated. Contact an administrator.');
        } else {
          setError(err.message || 'Invalid administrator credentials');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 relative transition-colors">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-24 font-bold text-text">LearnStack Admin Console</h1>
          <p className="text-14 text-text-muted">
            Sign in with an administrative account to manage organizations, users, and content.
          </p>
        </div>

        <Card className="p-6 bg-surface border-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-lg bg-error/10 border border-error/20 flex items-start gap-2.5 text-error text-14">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@organization.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign In to Admin Console
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-13 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} /> Back to Learner Login
          </Link>
        </div>
      </div>
    </div>
  );
};
