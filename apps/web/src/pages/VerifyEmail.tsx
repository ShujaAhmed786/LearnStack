import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AlertCircle, CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import { ApiRequestError } from '../lib/api';
import { ThemeToggle } from '../components/ThemeToggle';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendCode, user } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);

  // 6 separate input digits
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // 60-second cooldown timer
  const [cooldown, setCooldown] = useState(60);

  // If already authenticated and verified, redirect to dashboard
  useEffect(() => {
    if (user && user.emailVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Focus first input box on load
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerify = useCallback(
    async (codeToSubmit: string) => {
      if (!email.trim()) {
        setError('Please provide an email address.');
        return;
      }
      if (codeToSubmit.length !== 6) {
        setError('Please enter all 6 digits.');
        return;
      }

      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      try {
        await verifyEmail(email.trim(), codeToSubmit);
        navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError('Failed to verify email. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, verifyEmail, navigate]
  );

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    const newDigits = [...digits];
    newDigits[index] = cleaned.slice(-1); // Take last entered digit
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump to previous and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const targetFocus = Math.min(pasted.length, 5);
    inputRefs.current[targetFocus]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !email.trim()) return;

    setIsResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await resendCode(email.trim());
      setSuccessMsg(res.message || 'A new verification code has been dispatched.');
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-bg relative transition-colors">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-primary mb-3">
            <Mail size={24} />
          </div>
          <h1 className="text-24 font-semibold text-text tracking-tight">
            Verify your email
          </h1>
          <p className="text-14 text-text-muted mt-1 text-center">
            We sent a 6-digit verification code to
          </p>
          <span className="text-14 font-medium text-text mt-0.5 font-mono">
            {email || 'your email address'}
          </span>
        </div>

        {/* Card Container */}
        <Card className="w-full p-8">
          {error && (
            <div className="p-3 mb-6 bg-danger/10 border border-danger/30 rounded-lg flex items-start gap-2.5 text-danger text-14">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-6 bg-success/10 border border-success/30 rounded-lg flex items-start gap-2.5 text-success text-14">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email input field if not provided in URL */}
          {!emailParam && (
            <div className="mb-6">
              <label className="block text-14 text-text-muted mb-1.5 font-medium">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg bg-surface border border-border text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
          )}

          {/* 6 Digit Input Boxes */}
          <div className="flex justify-between items-center gap-2 sm:gap-3 mb-6">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isSubmitting}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-24 font-bold font-mono rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            ))}
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            fullWidth
            onClick={() => handleVerify(digits.join(''))}
            disabled={isSubmitting || digits.join('').length !== 6}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </Button>

          {/* Resend Cooldown Section */}
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-13">
            <span className="text-text-muted">Didn't receive the code?</span>

            {cooldown > 0 ? (
              <span className="text-text-muted font-mono">
                Resend in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-primary hover:text-primary-hover font-medium flex items-center gap-1 focus:outline-none"
              >
                <RotateCcw size={13} className={isResending ? 'animate-spin' : ''} />
                <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
              </button>
            )}
          </div>
        </Card>

        {/* Back to Login */}
        <p className="text-14 text-text-muted text-center mt-6">
          Need to use another email?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Back to Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
