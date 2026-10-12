import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { CheckCircle2, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

export const PurchaseSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const courseSlugParam = searchParams.get('course');
  const isFree = searchParams.get('free') === 'true';

  const [confirming, setConfirming] = useState(Boolean(sessionId));
  const [courseSlug, setCourseSlug] = useState<string>(courseSlugParam || '');
  const [courseTitle, setCourseTitle] = useState<string>('');

  useEffect(() => {
    async function confirmPurchase() {
      if (!sessionId) {
        setConfirming(false);
        return;
      }

      try {
        setConfirming(true);
        const data = await api.post<{
          success: boolean;
          enrolled: boolean;
          courseSlug: string;
          courseTitle: string;
        }>('/v1/purchases/confirm', { sessionId });

        if (data.courseSlug) {
          setCourseSlug(data.courseSlug);
        }
        if (data.courseTitle) {
          setCourseTitle(data.courseTitle);
        }
      } catch (err: any) {
        console.warn('Purchase confirmation warning:', err);
        // Even if session already confirmed, fall back gracefully
      } finally {
        setConfirming(false);
      }
    }

    confirmPurchase();
  }, [sessionId]);

  const targetCourseUrl = courseSlug ? `/courses/${courseSlug}` : '/courses';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <Card className="p-8 md:p-10 bg-surface border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-12 font-bold tracking-wide uppercase mb-1">
              <Sparkles size={13} />
              <span>{isFree ? 'Free Enrollment Active' : 'Payment Confirmed'}</span>
            </div>
            <h1 className="text-28 md:text-32 font-heading font-bold text-text">
              {isFree ? "You're Enrolled!" : 'Welcome to the Course!'}
            </h1>
            <p className="text-15 text-text-muted max-w-md mx-auto leading-relaxed">
              {courseTitle ? (
                <>Your enrollment for <strong>{courseTitle}</strong> is active. You have full access to all modules, video lectures, and quizzes.</>
              ) : (
                'Your course enrollment is confirmed and ready. You now have full access to all curriculum lessons and quizzes.'
              )}
            </p>
          </div>

          {confirming ? (
            <div className="py-4 space-y-2">
              <Skeleton height="40px" className="w-48 mx-auto" />
              <p className="text-13 text-text-muted">Finalizing your course workspace...</p>
            </div>
          ) : (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={targetCourseUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-[#0A1628] font-bold text-15 transition-colors shadow-sm"
              >
                <BookOpen size={18} />
                <span>Start Learning Now</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-surface-hover hover:bg-surface border border-border text-text font-medium text-14 transition-colors"
              >
                <span>Go to Dashboard</span>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};
