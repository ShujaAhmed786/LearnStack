import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { Quiz, QuizAttempt } from '@learnstack/shared';
import { Clock, HelpCircle, Target, Trophy, ArrowRight, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export const QuizIntro: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fromCourse = searchParams.get('from');
  const courseSlug = searchParams.get('courseSlug') || searchParams.get('roadmapSlug');
  const topicId = searchParams.get('topicId');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const [quizData, attemptsData] = await Promise.all([
          apiFetch<Quiz>(`/v1/quizzes/${id}`),
          apiFetch<QuizAttempt[]>(`/v1/quizzes/${id}/attempts`),
        ]);
        setQuiz(quizData);
        setAttempts(attemptsData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleStartQuiz = async () => {
    if (!id) return;
    try {
      setStarting(true);
      setError(null);
      const res = await apiFetch<{ attemptId: string }>(`/v1/quizzes/${id}/start`, {
        method: 'POST',
      });
      const queryParams = new URLSearchParams({
        attemptId: res.attemptId,
        ...(fromCourse ? { from: fromCourse } : {}),
        ...(courseSlug ? { courseSlug, roadmapSlug: courseSlug } : {}),
        ...(topicId ? { topicId } : {}),
      }).toString();
      navigate(`/quizzes/${id}/take?${queryParams}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <Skeleton height="36px" className="w-2/3" />
          <Skeleton height="150px" className="w-full" />
          <Skeleton height="200px" className="w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !quiz) {
    return (
      <Layout>
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8 max-w-md mx-auto">
          <h3 className="text-20 font-semibold text-text mb-2">Quiz Not Found</h3>
          <p className="text-14 text-text-muted mb-6">
            {error || 'The quiz could not be loaded.'}
          </p>
          <Link
            to={courseSlug ? `/courses/${courseSlug}` : '/quizzes'}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-14 font-medium rounded-lg transition-colors bg-surface border border-border text-text hover:bg-surface-hover shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>{courseSlug ? 'Back to Course' : 'Back to Quizzes'}</span>
          </Link>
        </div>
      </Layout>
    );
  }

  const questionCount = quiz.questions?.length ?? 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={courseSlug ? `/courses/${courseSlug}` : '/quizzes'}
          className="inline-flex items-center gap-1.5 text-14 text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{courseSlug ? 'Back to Course' : 'All Quizzes'}</span>
        </Link>

        {/* Main Info Card */}
        <Card className="p-8 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {quiz.topic && (
                <span className="text-12 font-mono text-primary px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {quiz.topic.title}
                </span>
              )}
              <span className="text-12 text-text-muted">
                Passing Score: {quiz.passingScore}%
              </span>
            </div>
            <h1 className="text-32 font-semibold text-text tracking-tight">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-16 text-text-muted mt-3 leading-relaxed">
                {quiz.description}
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border">
            <div className="p-4 rounded-lg bg-surface-hover/50 text-center">
              <HelpCircle size={20} className="text-primary mx-auto mb-1.5" />
              <div className="text-20 font-semibold text-text">{questionCount}</div>
              <div className="text-12 text-text-muted">Questions</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-hover/50 text-center">
              <Clock size={20} className="text-accent mx-auto mb-1.5" />
              <div className="text-20 font-semibold text-text">
                {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'None'}
              </div>
              <div className="text-12 text-text-muted">Time Limit</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-hover/50 text-center">
              <Target size={20} className="text-success mx-auto mb-1.5" />
              <div className="text-20 font-semibold text-text">{quiz.passingScore}%</div>
              <div className="text-12 text-text-muted">Passing Grade</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-hover/50 text-center">
              <Trophy size={20} className="text-warning mx-auto mb-1.5" />
              <div className="text-20 font-semibold text-text">
                {quiz.bestScore !== null && quiz.bestScore !== undefined ? `${quiz.bestScore}%` : '—'}
              </div>
              <div className="text-12 text-text-muted">Your Best</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-14 text-text-muted">
              {quiz.timeLimitMinutes
                ? `Timer starts immediately once you click start.`
                : 'Take your time. You can review your answers at the end.'}
            </div>

            <Button
              onClick={handleStartQuiz}
              disabled={starting || questionCount === 0}
              className="flex items-center gap-2"
            >
              <span>{starting ? 'Preparing Quiz...' : attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>

        {/* Previous Attempts History */}
        {attempts.length > 0 && (
          <Card className="p-6">
            <h3 className="text-18 font-semibold text-text mb-4">Previous Attempts</h3>
            <div className="divide-y divide-border">
              {attempts.map((att, idx) => (
                <div
                  key={att.id}
                  className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-12 font-mono text-text-muted">
                      #{attempts.length - idx}
                    </span>
                    <div>
                      <div className="text-14 font-medium text-text">
                        {new Date(att.startedAt).toLocaleString()}
                      </div>
                      <div className="text-12 text-text-muted">
                        {att.completedAt ? 'Completed' : 'Incomplete'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {att.score !== null && att.score !== undefined ? (
                      <span
                        className={`inline-flex items-center gap-1 text-12 font-medium px-2.5 py-0.5 rounded ${
                          att.passed
                            ? 'text-success bg-success/10 border border-success/20'
                            : 'text-danger bg-danger/10 border border-danger/20'
                        }`}
                      >
                        {att.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {att.score}%
                      </span>
                    ) : (
                      <span className="text-12 text-text-muted">—</span>
                    )}

                    {att.completedAt && (
                      <Link
                        to={`/quizzes/${quiz.id}/results/${att.id}`}
                        className="text-12 text-primary hover:underline"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
