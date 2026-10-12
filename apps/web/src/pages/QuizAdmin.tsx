import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Skeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Quiz, Question, QuestionType, Topic } from '@learnstack/shared';
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Target,
  X,
  CheckCircle2,
} from 'lucide-react';

export const QuizAdmin: React.FC = () => {
  const { user } = useAuth();
  const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    topicId: '',
    timeLimitMinutes: '' as number | string,
    passingScore: 70,
  });

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState<{
    text: string;
    type: QuestionType;
    options: string[];
    newOption: string;
    correctAnswer: string;
    explanation: string;
    points: number;
    order: number;
  }>({
    text: '',
    type: 'MULTIPLE_CHOICE',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    newOption: '',
    correctAnswer: 'Option A',
    explanation: '',
    points: 1,
    order: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [quizData, topicsData] = await Promise.all([
        apiFetch<Quiz[]>('/v1/quizzes'),
        apiFetch<Topic[]>('/v1/search?q=a').catch(() => []), // fetch topics if available
      ]);
      setQuizzes(quizData);
      setTopics(topicsData);

      if (quizData.length > 0 && !selectedQuiz) {
        // Load details for first quiz
        const fullQuiz = await apiFetch<Quiz>(`/v1/quizzes/${quizData[0].id}`);
        setSelectedQuiz(fullQuiz);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const selectQuiz = async (quiz: Quiz) => {
    try {
      const fullQuiz = await apiFetch<Quiz>(`/v1/quizzes/${quiz.id}`);
      setSelectedQuiz(fullQuiz);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz details');
    }
  };

  // Open Quiz Modal
  const openCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizForm({
      title: '',
      description: '',
      topicId: '',
      timeLimitMinutes: '',
      passingScore: 70,
    });
    setFormError(null);
    setIsQuizModalOpen(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description || '',
      topicId: quiz.topicId || '',
      timeLimitMinutes: quiz.timeLimitMinutes || '',
      passingScore: quiz.passingScore,
    });
    setFormError(null);
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: quizForm.title,
        description: quizForm.description || undefined,
        topicId: quizForm.topicId || undefined,
        timeLimitMinutes: quizForm.timeLimitMinutes ? Number(quizForm.timeLimitMinutes) : undefined,
        passingScore: Number(quizForm.passingScore),
      };

      if (editingQuiz) {
        const updated = await apiFetch<Quiz>(`/v1/quizzes/${editingQuiz.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setQuizzes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        setSelectedQuiz(updated);
      } else {
        const created = await apiFetch<Quiz>('/v1/quizzes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setQuizzes((prev) => [created, ...prev]);
        setSelectedQuiz(created);
      }

      setIsQuizModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (!confirm(`Are you sure you want to delete quiz "${quiz.title}"?`)) return;
    try {
      await apiFetch(`/v1/quizzes/${quiz.id}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      if (selectedQuiz?.id === quiz.id) {
        setSelectedQuiz(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete quiz');
    }
  };

  // Open Question Modal
  const openAddQuestion = () => {
    const nextOrder = (selectedQuiz?.questions?.length || 0) + 1;
    setQuestionForm({
      text: '',
      type: 'MULTIPLE_CHOICE',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      newOption: '',
      correctAnswer: 'Option A',
      explanation: '',
      points: 1,
      order: nextOrder,
    });
    setFormError(null);
    setIsQuestionModalOpen(true);
  };

  const handleAddQuestionOption = () => {
    if (questionForm.newOption.trim()) {
      const updatedOptions = [...questionForm.options, questionForm.newOption.trim()];
      setQuestionForm({
        ...questionForm,
        options: updatedOptions,
        newOption: '',
        correctAnswer: questionForm.correctAnswer || updatedOptions[0],
      });
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    const updated = questionForm.options.filter((_, idx) => idx !== indexToRemove);
    setQuestionForm({
      ...questionForm,
      options: updated,
      correctAnswer: updated[0] || '',
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const q = questionForm;
      let finalOptions = q.options;

      if (q.type === 'TRUE_FALSE') {
        finalOptions = ['True', 'False'];
      } else if (q.type === 'SHORT_ANSWER') {
        finalOptions = [];
      }

      await apiFetch(`/v1/quizzes/${selectedQuiz.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          questions: [
            {
              text: q.text,
              type: q.type,
              options: finalOptions,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || undefined,
              points: Number(q.points),
              order: Number(q.order),
            },
          ],
        }),
      });

      // Reload selected quiz
      const updatedQuiz = await apiFetch<Quiz>(`/v1/quizzes/${selectedQuiz.id}`);
      setSelectedQuiz(updatedQuiz);
      setIsQuestionModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    if (!selectedQuiz) return;
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await apiFetch(`/v1/quizzes/${selectedQuiz.id}/questions/${question.id}`, {
        method: 'DELETE',
      });
      const updatedQuiz = await apiFetch<Quiz>(`/v1/quizzes/${selectedQuiz.id}`);
      setSelectedQuiz(updatedQuiz);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  return (
    <Layout
      title="Quiz Builder"
      description="Create, configure, and manage assessments with automated grading"
      actions={
        <Button onClick={openCreateQuiz} className="flex items-center gap-2">
          <Plus size={16} />
          <span>New Quiz</span>
        </Button>
      }
    >
      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height="350px" className="md:col-span-1" />
          <Skeleton height="350px" className="md:col-span-2" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-18 font-semibold text-text mb-2">No quizzes created yet</h3>
          <p className="text-14 text-text-muted mb-6">
            Create your first quiz to evaluate learner understanding.
          </p>
          <Button onClick={openCreateQuiz} className="inline-flex items-center gap-2">
            <Plus size={16} />
            <span>Create Quiz</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: Quiz List */}
          <div className="space-y-3">
            <h3 className="text-16 font-semibold text-text px-1">All Quizzes</h3>
            {quizzes.map((q) => {
              const isSelected = selectedQuiz?.id === q.id;

              return (
                <div
                  key={q.id}
                  onClick={() => selectQuiz(q)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-hover border-primary text-text shadow-sm'
                      : 'bg-surface border-border text-text-muted hover:border-text-muted hover:text-text'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-15 text-text truncate">
                      {q.title}
                    </span>
                    <span className="text-12 font-mono px-2 py-0.5 rounded bg-surface border border-border">
                      {q._count?.questions ?? 0} Qs
                    </span>
                  </div>

                  {q.description && (
                    <p className="text-12 text-text-muted truncate mb-2">{q.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-12">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {q.timeLimitMinutes ? `${q.timeLimitMinutes}m` : 'Untimed'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target size={12} /> {q.passingScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Quiz Details & Questions Editor */}
          <div className="md:col-span-2 space-y-6">
            {selectedQuiz ? (
              <Card className="p-6 space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
                  <div>
                    <h2 className="text-24 font-semibold text-text tracking-tight">
                      {selectedQuiz.title}
                    </h2>
                    <p className="text-14 text-text-muted mt-1">
                      {selectedQuiz.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditQuiz(selectedQuiz)}
                      className="flex items-center gap-1"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </Button>
                    {isOrgAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteQuiz(selectedQuiz)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Questions Section Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-18 font-semibold text-text flex items-center gap-2">
                    <span>Questions ({selectedQuiz.questions?.length ?? 0})</span>
                  </h3>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openAddQuestion}
                    className="flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </Button>
                </div>

                {/* Questions List */}
                {selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
                  <div className="space-y-4">
                    {selectedQuiz.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-5 rounded-xl bg-surface-hover/30 border border-border space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-12 font-mono px-2 py-0.5 rounded bg-surface border border-border text-primary">
                              #{idx + 1}
                            </span>
                            <span className="text-12 font-mono text-text-muted capitalize">
                              {q.type.replace('_', ' ').toLowerCase()} ({q.points} pt)
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteQuestion(q)}
                            className="p-1 text-text-muted hover:text-danger rounded"
                            title="Delete Question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <p className="text-15 font-medium text-text">{q.text}</p>

                        {/* Options */}
                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-13 pt-1">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                                  opt === q.correctAnswer
                                    ? 'bg-success/10 border-success/30 text-success font-medium'
                                    : 'bg-surface border-border text-text-muted'
                                }`}
                              >
                                <span className="font-mono text-11 opacity-70">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                <span>{opt}</span>
                                {opt === q.correctAnswer && (
                                  <CheckCircle2 size={14} className="ml-auto" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'TRUE_FALSE' && (
                          <div className="text-13 flex items-center gap-2 pt-1">
                            <span className="text-text-muted">Correct:</span>
                            <span className="font-semibold text-success px-2 py-0.5 rounded bg-success/10 border border-success/30">
                              {q.correctAnswer}
                            </span>
                          </div>
                        )}

                        {q.type === 'SHORT_ANSWER' && (
                          <div className="text-13 flex items-center gap-2 pt-1">
                            <span className="text-text-muted">Accepted answer:</span>
                            <span className="font-mono text-primary px-2 py-0.5 rounded bg-surface border border-border">
                              {q.correctAnswer}
                            </span>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="text-12 text-text-muted italic pt-1 border-t border-border/40">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-surface-hover/20 rounded-xl border border-dashed border-border p-6">
                    <p className="text-14 text-text-muted mb-4">
                      This quiz doesn&apos;t have any questions yet.
                    </p>
                    <Button onClick={openAddQuestion} size="sm" className="inline-flex items-center gap-1">
                      <Plus size={14} /> Add First Question
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-12 text-center text-text-muted">
                Select a quiz from the left or create a new one.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 relative shadow-2xl">
            <button
              onClick={() => setIsQuizModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-text-muted hover:text-text rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-20 font-semibold text-text mb-4">
              {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
            </h3>

            {formError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <Input
                label="Quiz Title"
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                required
                placeholder="e.g. JavaScript Async Fundamentals"
              />

              <div>
                <label className="block text-14 text-text-muted mb-1">Description (optional)</label>
                <textarea
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="What concepts will this test?"
                />
              </div>

              <div>
                <label className="block text-14 text-text-muted mb-1">Associated Topic (optional)</label>
                <select
                  value={quizForm.topicId}
                  onChange={(e) => setQuizForm({ ...quizForm, topicId: e.target.value })}
                  className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">None (General Quiz)</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Time Limit (minutes, optional)"
                  type="number"
                  value={quizForm.timeLimitMinutes}
                  onChange={(e) => setQuizForm({ ...quizForm, timeLimitMinutes: e.target.value })}
                  placeholder="e.g. 15 (leave blank for none)"
                />

                <Input
                  label="Passing Score (%)"
                  type="number"
                  value={quizForm.passingScore}
                  onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                  required
                  min={0}
                  max={100}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setIsQuizModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Quiz'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setIsQuestionModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-text-muted hover:text-text rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-20 font-semibold text-text mb-4">Add Question</h3>

            {formError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-14 text-text-muted mb-1">Question Type</label>
                <select
                  value={questionForm.type}
                  onChange={(e) => {
                    const newType = e.target.value as QuestionType;
                    setQuestionForm({
                      ...questionForm,
                      type: newType,
                      correctAnswer:
                        newType === 'TRUE_FALSE'
                          ? 'True'
                          : newType === 'MULTIPLE_CHOICE'
                          ? questionForm.options[0] || ''
                          : '',
                    });
                  }}
                  className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-14 text-text-muted mb-1">Question Prompt</label>
                <textarea
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  required
                  rows={3}
                  className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter the question text..."
                />
              </div>

              {/* Multiple Choice Options Builder */}
              {questionForm.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-14 text-text-muted">Options & Correct Answer</label>
                  <div className="space-y-2">
                    {questionForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={questionForm.correctAnswer === opt}
                          onChange={() => setQuestionForm({ ...questionForm, correctAnswer: opt })}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...questionForm.options];
                            newOpts[idx] = e.target.value;
                            setQuestionForm({
                              ...questionForm,
                              options: newOpts,
                              correctAnswer:
                                questionForm.correctAnswer === opt
                                  ? e.target.value
                                  : questionForm.correctAnswer,
                            });
                          }}
                          className="flex-1 rounded-lg bg-surface border border-border p-2.5 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {questionForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="p-2 text-text-muted hover:text-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={questionForm.newOption}
                      onChange={(e) => setQuestionForm({ ...questionForm, newOption: e.target.value })}
                      placeholder="Add another option..."
                      className="flex-1 rounded-lg bg-surface border border-border p-2 text-13 text-text"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddQuestionOption}
                    >
                      Add Option
                    </Button>
                  </div>
                  <p className="text-12 text-text-muted">
                    Radio button indicates the correct answer.
                  </p>
                </div>
              )}

              {/* True/False Selection */}
              {questionForm.type === 'TRUE_FALSE' && (
                <div>
                  <label className="block text-14 text-text-muted mb-1">Correct Answer</label>
                  <div className="flex gap-4">
                    {['True', 'False'].map((val) => (
                      <label key={val} className="flex items-center gap-2 text-14 text-text cursor-pointer">
                        <input
                          type="radio"
                          name="tfAnswer"
                          value={val}
                          checked={questionForm.correctAnswer === val}
                          onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                        />
                        <span>{val}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {questionForm.type === 'SHORT_ANSWER' && (
                <Input
                  label="Correct Answer (case-insensitive)"
                  value={questionForm.correctAnswer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  required
                  placeholder="e.g. useEffect"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Points"
                  type="number"
                  min={1}
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })}
                  required
                />
                <Input
                  label="Order"
                  type="number"
                  value={questionForm.order}
                  onChange={(e) => setQuestionForm({ ...questionForm, order: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-14 text-text-muted mb-1">Explanation (shown after submission)</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Why is this answer correct?"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setIsQuestionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Question'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Layout>
  );
};
