import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { Quiz, Question, SubmitQuizResult } from '@learnstack/shared';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const QuizTake: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer state (seconds remaining)
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const submittedRef = useRef(false);

  // Load quiz and questions
  useEffect(() => {
    async function loadQuizForTaking() {
      if (!id || !attemptId) {
        navigate(`/quizzes/${id || ''}`);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Quiz>(`/v1/quizzes/${id}`);
        setQuiz(data);
        const sorted = (data.questions || []).sort((a, b) => a.order - b.order);
        setQuestions(sorted);

        if (data.timeLimitMinutes) {
          setTimeLeft(data.timeLimitMinutes * 60);
        }

        trackEvent('quiz_started', {
          metadata: { quizId: id, attemptId },
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }

    loadQuizForTaking();
  }, [id, attemptId, navigate]);

  // Submission handler
  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (submittedRef.current || !attemptId || !id) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);

      try {
        const res = await apiFetch<SubmitQuizResult>(`/v1/attempts/${attemptId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers }),
        });

        trackEvent('quiz_completed', {
          metadata: {
            quizId: id,
            attemptId,
            score: res.score,
            passed: res.passed,
          },
        });

        const fromCourse = searchParams.get('from');
        const courseSlug = searchParams.get('courseSlug') || searchParams.get('roadmapSlug');
        const topicId = searchParams.get('topicId');

        const queryParams = new URLSearchParams({
          ...(fromCourse ? { from: fromCourse } : {}),
          ...(courseSlug ? { courseSlug, roadmapSlug: courseSlug } : {}),
          ...(topicId ? { topicId } : {}),
        }).toString();

        const targetUrl = `/quizzes/${id}/results/${res.attemptId}${
          queryParams ? `?${queryParams}` : ''
        }`;
        navigate(targetUrl, { replace: true });
      } catch (err: unknown) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(err instanceof Error ? err.message : 'Failed to submit quiz');
        if (isAutoSubmit) {
          alert('Time has expired! Failed to submit automatically. Please click Submit Quiz.');
        }
      }
    },
    [attemptId, id, answers, navigate, searchParams]
  );

  // Timer countdown hook
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || loading || submittedRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, handleSubmit]);

  const handleSelectAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton height="32px" className="w-1/2" />
          <Skeleton height="8px" className="w-full" />
          <Skeleton height="300px" className="w-full" />
        </div>
      </Layout>
    );
  }

  if (error || questions.length === 0) {
    return (
      <Layout>
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8 max-w-md mx-auto">
          <AlertCircle size={32} className="text-danger mx-auto mb-3" />
          <h3 className="text-18 font-semibold text-text mb-2">Quiz Unavailable</h3>
          <p className="text-14 text-text-muted mb-4">{error || 'No questions available.'}</p>
          <Button onClick={() => navigate('/quizzes')}>Return to Quizzes</Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const answeredCount = Object.keys(answers).length;

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const isLowTime = timeLeft !== null && timeLeft < 60;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Control Bar with Timer & Counter */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-18 font-semibold text-text truncate max-w-md">
              {quiz?.title}
            </h2>
            <div className="text-12 text-text-muted">
              Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
            </div>
          </div>

          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-14 font-medium transition-colors ${
                isLowTime
                  ? 'bg-danger/10 border-danger/30 text-danger animate-pulse'
                  : 'bg-surface border-border text-primary'
              }`}
            >
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14">
            {error}
          </div>
        )}

        {/* Current Question Card */}
        <Card className="p-8 space-y-6">
          <div className="flex items-center justify-between text-12 font-mono text-text-muted">
            <span>Points: {currentQuestion.points}</span>
            <span className="capitalize">{currentQuestion.type.replace('_', ' ').toLowerCase()}</span>
          </div>

          <h3 className="text-20 font-semibold text-text leading-snug">
            {currentQuestion.text}
          </h3>

          {/* Options Renderer */}
          <div className="space-y-3 pt-2">
            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              currentQuestion.options.map((opt, idx) => {
                const isSelected = answers[currentQuestion.id] === opt;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAnswer(currentQuestion.id, opt)}
                    className={`w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-text shadow-sm'
                        : 'bg-surface border-border text-text-muted hover:border-text-muted hover:text-text'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-12 font-mono shrink-0 ${
                          isSelected
                            ? 'border-primary bg-primary text-bg font-semibold'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-15">{opt}</span>
                    </div>

                    {isSelected && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}

            {currentQuestion.type === 'TRUE_FALSE' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((val) => {
                  const isSelected = answers[currentQuestion.id] === val;

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, val)}
                      className={`p-5 rounded-lg border text-center font-medium text-16 transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-surface border-border text-text hover:border-text-muted'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'SHORT_ANSWER' && (
              <div>
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-3.5 rounded-lg bg-surface border border-border text-15 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
            )}
          </div>
        </Card>

        {/* Navigation & Submission Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0 || submitting}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </Button>

          <div className="flex items-center gap-3">
            {currentIndex < questions.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1.5"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6"
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Submitting...' : 'Submit Quiz'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
