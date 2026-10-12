import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { Markdown } from '../components/Markdown';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { DiscussionThread, DiscussionPost, Roadmap } from '@learnstack/shared';
import {
  MessageSquare,
  Pin,
  CheckCircle2,
  Plus,
  Send,
  Check,
  Shield,
  X,
  MessageCircle,
} from 'lucide-react';

export const Discussions: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialThreadId = searchParams.get('thread');

  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'recent' | 'active'>('recent');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  // Active thread view
  const [activeThread, setActiveThread] = useState<DiscussionThread | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // New Thread Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);

  const isStaff =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'ORG_ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('sort', sort);
      if (selectedCourseId !== 'all') {
        queryParams.set('courseId', selectedCourseId);
      }

      const [threadData, courseData] = await Promise.all([
        api.get<DiscussionThread[]>(`/v1/discussions?${queryParams.toString()}`),
        api.get<Roadmap[]>('/v1/roadmaps').catch(() => []),
      ]);

      setThreads(threadData);
      setCourses(courseData);

      // If initial thread passed in url, load it
      if (initialThreadId && !activeThread) {
        loadThreadDetails(initialThreadId);
      }
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [sort, selectedCourseId]);

  const loadThreadDetails = async (threadId: string) => {
    try {
      const data = await api.get<DiscussionThread>(`/v1/discussions/${threadId}`);
      setActiveThread(data);
      setSearchParams({ thread: threadId });
    } catch (err) {
      console.error('Failed to load thread details:', err);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      setCreatingThread(true);
      const created = await api.post<DiscussionThread>('/v1/discussions', {
        title: newTitle.trim(),
        content: newContent.trim(),
        courseId: newCourseId || undefined,
      });

      setShowNewModal(false);
      setNewTitle('');
      setNewContent('');
      setNewCourseId('');
      await fetchThreads();
      loadThreadDetails(created.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create discussion');
    } finally {
      setCreatingThread(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyContent.trim()) return;

    try {
      setSubmittingReply(true);
      const newPost = await api.post<DiscussionPost>(
        `/v1/discussions/${activeThread.id}/posts`,
        { content: replyContent.trim() }
      );

      setActiveThread((prev) =>
        prev
          ? {
              ...prev,
              posts: [...(prev.posts || []), newPost],
              postCount: (prev.postCount || 0) + 1,
            }
          : null
      );
      setReplyContent('');
      // Refresh thread list count
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? { ...t, postCount: (t.postCount || 0) + 1, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleAnswer = async (postId: string) => {
    if (!activeThread) return;
    try {
      const updated = await api.patch<DiscussionPost>(
        `/v1/discussions/${activeThread.id}/posts/${postId}/answer`
      );

      setActiveThread((prev) => {
        if (!prev) return null;
        const posts = (prev.posts || []).map((p) => {
          if (p.id === postId) {
            return { ...p, isAnswer: updated.isAnswer };
          }
          // If updated was set to true, clear other answers
          return updated.isAnswer ? { ...p, isAnswer: false } : p;
        });

        // Re-sort: accepted answers top, then by time
        posts.sort((a, b) => {
          if (a.isAnswer === b.isAnswer) {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return a.isAnswer ? -1 : 1;
        });

        return {
          ...prev,
          posts,
          hasAcceptedAnswer: updated.isAnswer,
        };
      });

      // Update in main list
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id ? { ...t, hasAcceptedAnswer: updated.isAnswer } : t
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle accepted answer');
    }
  };

  const handleTogglePin = async () => {
    if (!activeThread) return;
    try {
      const updated = await api.patch<{ pinned: boolean }>(
        `/v1/discussions/${activeThread.id}/pin`
      );
      setActiveThread((prev) => (prev ? { ...prev, pinned: updated.pinned } : null));
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, pinned: updated.pinned } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pin');
    }
  };

  return (
    <Layout>
      <Header
        title="Discussion Forums"
        description="Ask questions, share solutions, and learn with instructors and peers"
        actions={
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold flex items-center gap-2"
          >
            <Plus size={16} />
            <span>New Discussion</span>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-surface border border-border rounded-lg p-1 text-12 font-medium">
            <button
              onClick={() => setSort('recent')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sort === 'recent'
                  ? 'bg-primary text-[#0A1628] font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Recent Questions
            </button>
            <button
              onClick={() => setSort('active')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sort === 'active'
                  ? 'bg-primary text-[#0A1628] font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Active Discussions
            </button>
          </div>

          {courses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-12 text-text-muted">Filter by Course:</span>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-surface border border-border text-text rounded-lg px-3 py-1.5 text-12 focus:outline-none focus:border-primary"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Thread List Column */}
          <div className={`${activeThread ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
            {loading ? (
              <div className="space-y-3">
                <Skeleton height="90px" className="rounded-xl" />
                <Skeleton height="90px" className="rounded-xl" />
                <Skeleton height="90px" className="rounded-xl" />
              </div>
            ) : threads.length === 0 ? (
              <Card className="text-center py-16 px-6 bg-surface border-border space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
                  <MessageSquare size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-18 font-bold text-text">No Discussions Yet</h3>
                  <p className="text-13 text-text-muted max-w-sm mx-auto">
                    Be the first to start a conversation or ask a question about your learning track.
                  </p>
                </div>
                <Button
                  onClick={() => setShowNewModal(true)}
                  className="bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold"
                >
                  Start Discussion
                </Button>
              </Card>
            ) : (
              threads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
                const formattedTime = new Date(thread.updatedAt || thread.createdAt).toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric' }
                );

                return (
                  <Card
                    key={thread.id}
                    onClick={() => loadThreadDetails(thread.id)}
                    className={`p-4.5 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border bg-surface hover:border-primary/40'
                    } flex flex-col justify-between gap-3`}
                  >
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 text-11">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {thread.pinned && (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Pin size={11} />
                              <span>PINNED</span>
                            </span>
                          )}
                          {thread.hasAcceptedAnswer && (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 size={11} />
                              <span>ANSWERED</span>
                            </span>
                          )}
                          {thread.course && (
                            <span className="text-text-muted font-medium bg-surface-hover px-2 py-0.5 rounded-full border border-border truncate max-w-[150px]">
                              {thread.course.title}
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted shrink-0">{formattedTime}</span>
                      </div>

                      {/* Title */}
                      <h4 className="text-15 font-bold text-text line-clamp-2 hover:text-primary transition-colors">
                        {thread.title}
                      </h4>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-12 text-text-muted pt-2 border-t border-border">
                      <span className="font-medium text-text">
                        {thread.author?.name || 'Community Member'}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <MessageCircle size={13} />
                        <span>{thread.postCount || 1}</span>
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Thread Detail Column */}
          {activeThread && (
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-6 bg-surface border-border space-y-6 shadow-sm relative">
                {/* Close Button on Mobile */}
                <button
                  onClick={() => {
                    setActiveThread(null);
                    setSearchParams({});
                  }}
                  className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover"
                >
                  <X size={18} />
                </button>

                {/* Header */}
                <div className="space-y-3 pb-5 border-b border-border pr-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeThread.pinned && (
                      <span className="inline-flex items-center gap-1 text-11 font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        <Pin size={12} />
                        <span>Pinned Thread</span>
                      </span>
                    )}
                    {activeThread.course && (
                      <span className="text-11 font-medium text-text-muted bg-surface-hover px-2.5 py-0.5 rounded-full border border-border">
                        {activeThread.course.title}
                      </span>
                    )}
                    {activeThread.lesson && (
                      <span className="text-11 font-medium text-text-muted bg-surface-hover px-2.5 py-0.5 rounded-full border border-border">
                        Lesson: {activeThread.lesson.title}
                      </span>
                    )}
                  </div>

                  <h2 className="text-20 font-bold text-text">{activeThread.title}</h2>

                  <div className="flex items-center justify-between text-12 text-text-muted">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">
                        {activeThread.author?.name || 'Learner'}
                      </span>
                      {activeThread.author?.role && activeThread.author.role !== 'LEARNER' && (
                        <span className="text-10 font-bold px-2 py-0.2 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                          {activeThread.author.role}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(activeThread.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Staff Pin Control */}
                    {isStaff && (
                      <button
                        onClick={handleTogglePin}
                        className="text-12 font-medium text-text-muted hover:text-primary flex items-center gap-1"
                      >
                        <Pin size={13} />
                        <span>{activeThread.pinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Posts List */}
                <div className="space-y-4">
                  {activeThread.posts?.map((post, idx) => {
                    const isAuthorInstructor =
                      post.author?.role === 'INSTRUCTOR' ||
                      post.author?.role === 'ORG_ADMIN' ||
                      post.author?.role === 'SUPER_ADMIN';

                    return (
                      <div
                        key={post.id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          post.isAnswer
                            ? 'bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20'
                            : idx === 0
                            ? 'bg-surface-hover/30 border-border'
                            : 'bg-surface border-border'
                        }`}
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-13 text-text">
                              {post.author?.name || 'Member'}
                            </span>

                            {isAuthorInstructor && (
                              <span className="inline-flex items-center gap-1 text-10 font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                                <Shield size={11} />
                                <span>INSTRUCTOR</span>
                              </span>
                            )}

                            {post.isAnswer && (
                              <span className="inline-flex items-center gap-1 text-10 font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <Check size={11} />
                                <span>ACCEPTED ANSWER</span>
                              </span>
                            )}
                          </div>

                          <span className="text-11 text-text-muted">
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="text-14 text-text leading-relaxed">
                          <Markdown content={post.content} />
                        </div>

                        {/* Staff mark as answer button */}
                        {isStaff && idx > 0 && (
                          <div className="pt-2 border-t border-border flex justify-end">
                            <button
                              onClick={() => handleToggleAnswer(post.id)}
                              className={`text-12 font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                                post.isAnswer
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'text-text-muted hover:text-text hover:bg-surface-hover'
                              }`}
                            >
                              <Check size={13} />
                              <span>{post.isAnswer ? 'Accepted Answer ✓' : 'Mark as Accepted Answer'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleReplySubmit} className="pt-4 border-t border-border space-y-3">
                  <h4 className="text-13 font-bold text-text">Write a Reply</h4>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contribute your answer, insight, or follow-up question (Markdown supported)..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full bg-surface-hover border border-border rounded-xl p-3 text-14 text-text focus:outline-none focus:border-primary"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={submittingReply || !replyContent.trim()}
                      className="bg-primary text-[#0A1628] hover:bg-primary-hover font-bold flex items-center gap-1.5"
                    >
                      <Send size={14} />
                      <span>{submittingReply ? 'Posting...' : 'Post Reply'}</span>
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* New Discussion Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-18 font-bold text-text">Start a Discussion</h3>
              <p className="text-12 text-text-muted">
                Ask a technical question or start a topic for your learning community.
              </p>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-12 font-medium text-text mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., How do Kubernetes ReplicaSets maintain state during pod rollouts?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-14 text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-12 font-medium text-text mb-1">Associate Course</label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-13 text-text focus:outline-none focus:border-primary"
                >
                  <option value="">General (No Course)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-12 font-medium text-text mb-1">Description / Question *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide context, code snippets, or error messages (Markdown supported)..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg p-3 text-13 text-text focus:outline-none focus:border-primary font-mono text-12"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingThread}
                  className="bg-primary text-[#0A1628] hover:bg-primary-hover font-bold"
                >
                  {creatingThread ? 'Creating...' : 'Start Discussion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
