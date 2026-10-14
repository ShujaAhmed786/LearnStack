import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { apiFetch } from '../lib/api';
import { Quiz } from '@learnstack/shared';
import { HelpCircle, Clock, CheckCircle2, XCircle, ArrowRight, BookOpen } from 'lucide-react';

export const QuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Quiz[]>('/v1/quizzes');
        setQuizzes(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    }
    loadQuizzes();
  }, []);

  return (
    <Layout
      title="Knowledge Checks & Quizzes"
      description="Test your understanding with auto-graded assessments"
    >
      <Breadcrumbs items={[{ label: 'Quizzes' }]} />

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton height="24px" className="w-2/3" />
              <Skeleton height="16px" className="w-full" />
              <Skeleton height="20px" className="w-1/3" />
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8">
          <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-16 font-semibold text-text mb-1">No quizzes available</h3>
          <p className="text-14 text-text-muted">
            Quizzes will appear here once instructors publish them for your organization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((quiz) => {
            const hasAttempts = quiz.bestScore !== null && quiz.bestScore !== undefined;
            const passed = hasAttempts && quiz.bestScore! >= quiz.passingScore;

            return (
              <Card
                key={quiz.id}
                className="flex flex-col justify-between hover:border-primary/50 hover:bg-surface-hover/30 transition-all p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {quiz.topic ? (
                      <span className="text-12 font-mono text-primary flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        <BookOpen size={12} />
                        <span className="truncate max-w-[200px]">{quiz.topic.title}</span>
                      </span>
                    ) : (
                      <span className="text-12 font-mono text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                        General Assessment
                      </span>
                    )}

                    {hasAttempts && (
                      <div className="flex items-center gap-1.5">
                        {passed ? (
                          <span className="inline-flex items-center gap-1 text-12 font-medium text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                            <CheckCircle2 size={12} />
                            Passed ({quiz.bestScore}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-12 font-medium text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded">
                            <XCircle size={12} />
                            Score: {quiz.bestScore}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-18 font-semibold text-text tracking-tight mb-2">
                    {quiz.title}
                  </h3>

                  {quiz.description && (
                    <p className="text-14 text-text-muted line-clamp-2 mb-4">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-12 text-text-muted">
                    <span className="flex items-center gap-1">
                      <HelpCircle size={14} />
                      {quiz._count?.questions ?? 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes}m limit` : 'Untimed'}
                    </span>
                    <span>Pass: {quiz.passingScore}%</span>
                  </div>

                  <Link
                    to={`/quizzes/${quiz.id}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-12 font-medium rounded-lg transition-colors bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold shadow-sm"
                  >
                    <span>{hasAttempts ? 'Retake' : 'Start'}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
