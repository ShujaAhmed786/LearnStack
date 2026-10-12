import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { QuestionFeedback, QuizAttempt } from '@learnstack/shared';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Trophy, RotateCcw, BookOpen } from 'lucide-react';

interface AttemptWithFeedback extends QuizAttempt {
  feedback?: QuestionFeedback[];
}

export const QuizResults: React.FC = () => {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const [searchParams] = useSearchParams();

  const courseSlug = searchParams.get('courseSlug') || searchParams.get('roadmapSlug');

  const [attempt, setAttempt] = useState<AttemptWithFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      if (!attemptId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<AttemptWithFeedback>(`/v1/attempts/${attemptId}`);
        setAttempt(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load attempt results');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [attemptId]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton height="180px" className="w-full" />
          <Skeleton height="120px" className="w-full" />
          <Skeleton height="120px" className="w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !attempt) {
    return (
      <Layout>
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8 max-w-md mx-auto">
          <h3 className="text-20 font-semibold text-text mb-2">Results Not Found</h3>
          <p className="text-14 text-text-muted mb-4">{error || 'Unable to retrieve quiz results.'}</p>
          <Link to={`/quizzes/${id || ''}`}>
            <Button variant="secondary">Back to Quiz</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const passed = !!attempt.passed;
  const score = attempt.score ?? 0;
  const passingScore = attempt.quiz?.passingScore ?? 70;
  const feedback = attempt.feedback || [];

  const earnedPoints = feedback.reduce((sum, f) => sum + f.pointsEarned, 0);
  const totalPoints = feedback.reduce((sum, f) => sum + f.pointsPossible, 0);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          to={courseSlug ? `/courses/${courseSlug}` : `/quizzes/${id}`}
          className="inline-flex items-center gap-1.5 text-14 text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{courseSlug ? 'Back to Course' : 'Back to Quiz Overview'}</span>
        </Link>

        {/* Course completion banner */}
        {courseSlug && passed && (
          <div className="p-4 rounded-xl bg-success/15 border border-success/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="text-success" />
              </div>
              <div>
                <p className="text-15 font-semibold text-text">Lesson Auto-Completed!</p>
                <p className="text-12 text-text-muted">
                  You passed with {score}%. Your progress has been updated on the course.
                </p>
              </div>
            </div>
            <Link to={`/courses/${courseSlug}`}>
              <Button variant="primary" className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-center font-semibold">
                <span>Return to Course</span>
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        )}

        {/* Hero Score Card */}
        <Card className={`p-8 text-center relative overflow-hidden ${
          passed ? 'border-success/40 bg-gradient-to-b from-success/5 to-surface' : 'border-warning/40 bg-gradient-to-b from-warning/5 to-surface'
        }`}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-surface border border-border">
            {passed ? (
              <Trophy size={32} className="text-success" />
            ) : (
              <RotateCcw size={32} className="text-warning" />
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 text-14 font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wider text-12 border">
            {passed ? (
              <span className="text-success bg-success/10 border-success/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Passed
              </span>
            ) : (
              <span className="text-warning bg-warning/10 border-warning/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <XCircle size={16} /> Needs Practice
              </span>
            )}
          </div>

          <div className="text-48 font-bold text-text tracking-tight font-mono my-2">
            {score}%
          </div>

          <p className="text-14 text-text-muted max-w-sm mx-auto mb-6">
            You scored {earnedPoints} out of {totalPoints} total points. Required passing score is {passingScore}%.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to={`/quizzes/${id}${courseSlug ? `?from=course&courseSlug=${courseSlug}` : ''}`}>
              <Button variant="secondary" className="flex items-center gap-2">
                <RotateCcw size={16} />
                <span>Retake Quiz</span>
              </Button>
            </Link>
            {courseSlug ? (
              <Link to={`/courses/${courseSlug}`}>
                <Button variant="primary" className="flex items-center gap-2 font-semibold">
                  <BookOpen size={16} />
                  <span>Return to Course</span>
                </Button>
              </Link>
            ) : (
              <Link to="/quizzes">
                <Button variant="primary" className="flex items-center gap-2 font-semibold">
                  <span>All Quizzes</span>
                  <ArrowRight size={16} />
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Question Breakdown List */}
        <div className="space-y-4">
          <h3 className="text-20 font-semibold text-text">Question Breakdown</h3>

          {feedback.map((item, idx) => (
            <Card
              key={item.questionId}
              className={`p-6 border transition-all ${
                item.isCorrect
                  ? 'border-success/30 bg-surface'
                  : 'border-danger/30 bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-12 font-mono text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                    #{idx + 1}
                  </span>
                  {item.isCorrect ? (
                    <span className="text-12 font-medium text-success flex items-center gap-1">
                      <CheckCircle2 size={16} /> Correct (+{item.pointsEarned} pts)
                    </span>
                  ) : (
                    <span className="text-12 font-medium text-danger flex items-center gap-1">
                      <XCircle size={16} /> Incorrect (0 / {item.pointsPossible} pts)
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-16 font-medium text-text mb-4">
                {item.questionText}
              </h4>

              <div className="space-y-2 text-14">
                <div className="flex items-start gap-2">
                  <span className="text-text-muted w-28 shrink-0">Your answer:</span>
                  <span
                    className={`font-medium ${
                      item.isCorrect ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {item.userAnswer || <em className="text-text-muted font-normal">(No answer submitted)</em>}
                  </span>
                </div>

                {!item.isCorrect && (
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted w-28 shrink-0">Correct answer:</span>
                    <span className="font-medium text-primary font-mono">{item.correctAnswer}</span>
                  </div>
                )}

                {item.explanation && (
                  <div className="mt-3 pt-3 border-t border-border text-13 text-text-muted italic bg-surface-hover/30 p-2.5 rounded-lg">
                    💡 {item.explanation}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};
