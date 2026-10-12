import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { LiveSession, Roadmap } from '@learnstack/shared';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Radio,
  CheckCircle2,
  Plus,
  X,
  BookOpen,
} from 'lucide-react';

export const LiveSessions: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // Modal for scheduling session (instructors/admins)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newDuration, setNewDuration] = useState(60);

  const isStaff =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'ORG_ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const [sessionData, courseData] = await Promise.all([
        api.get<LiveSession[]>('/v1/live-sessions'),
        api.get<Roadmap[]>('/v1/roadmaps').catch(() => []),
      ]);
      setSessions(sessionData);
      setCourses(courseData);
    } catch (err) {
      console.error('Failed to load live sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRegister = async (sessionId: string) => {
    try {
      setRegisteringId(sessionId);
      await api.post(`/v1/live-sessions/${sessionId}/register`);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                isRegistered: true,
                registrationCount: (s.registrationCount || 0) + 1,
              }
            : s
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to register for session');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newScheduledAt) {
      alert('Please fill in session title and scheduled time');
      return;
    }

    try {
      setScheduling(true);
      await api.post('/v1/live-sessions', {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        courseId: newCourseId || undefined,
        scheduledAt: new Date(newScheduledAt).toISOString(),
        durationMinutes: Number(newDuration) || 60,
      });

      setShowScheduleModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewCourseId('');
      setNewScheduledAt('');
      setNewDuration(60);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule live session');
    } finally {
      setScheduling(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (selectedCourseId !== 'all' && s.courseId !== selectedCourseId) {
      return false;
    }
    if (filter === 'live') return s.status === 'LIVE';
    if (filter === 'upcoming') return s.status === 'SCHEDULED';
    if (filter === 'ended') return s.status === 'ENDED' || s.status === 'CANCELLED';
    return true;
  });

  return (
    <Layout>
      <Header
        title="Live Classes"
        description="Interactive instructor-led video classes and workshops"
        actions={
          isStaff ? (
            <Button
              onClick={() => setShowScheduleModal(true)}
              className="bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Schedule Class</span>
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-content mx-auto p-6 space-y-6">
        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center bg-surface border border-border rounded-lg p-1 text-12 font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-[#0A1628] font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              All ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                filter === 'live'
                  ? 'bg-danger text-white font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-danger animate-ping" />
              <span>Live Now ({sessions.filter((s) => s.status === 'LIVE').length})</span>
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'upcoming'
                  ? 'bg-primary text-[#0A1628] font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Upcoming ({sessions.filter((s) => s.status === 'SCHEDULED').length})
            </button>
            <button
              onClick={() => setFilter('ended')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'ended'
                  ? 'bg-primary text-[#0A1628] font-bold shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Past ({sessions.filter((s) => s.status === 'ENDED').length})
            </button>
          </div>

          {courses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-12 text-text-muted">Course:</span>
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

        {/* Sessions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton height="200px" className="rounded-xl" />
            <Skeleton height="200px" className="rounded-xl" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card className="text-center py-16 px-6 bg-surface border-border max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Video size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-18 font-bold text-text">No Live Classes Found</h3>
              <p className="text-13 text-text-muted max-w-md mx-auto">
                {filter === 'live'
                  ? 'There are no classes streaming live right now.'
                  : 'No scheduled live classes matching your filter.'}
              </p>
            </div>
            {isStaff && (
              <Button
                onClick={() => setShowScheduleModal(true)}
                className="bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold"
              >
                Schedule First Class
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSessions.map((session) => {
              const scheduledDate = new Date(session.scheduledAt);
              const isLive = session.status === 'LIVE';
              const isEnded = session.status === 'ENDED' || session.status === 'CANCELLED';
              const canJoinNow = session.canJoin || isLive || isStaff;
              const formattedDate = scheduledDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Card
                  key={session.id}
                  className={`p-6 bg-surface border-border transition-all flex flex-col justify-between space-y-5 shadow-sm ${
                    isLive ? 'border-danger/60 ring-1 ring-danger/40' : 'hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Status Badge & Course Header */}
                    <div className="flex items-center justify-between gap-2">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/15 text-danger font-bold text-11 border border-danger/30 animate-pulse">
                          <Radio size={13} className="animate-spin" />
                          <span>STREAMING LIVE NOW</span>
                        </span>
                      ) : isEnded ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-hover text-text-muted font-semibold text-11 border border-border">
                          <span>SESSION CONCLUDED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold text-11 border border-teal-500/20">
                          <Clock size={12} />
                          <span>SCHEDULED</span>
                        </span>
                      )}

                      {session.course && (
                        <span className="text-11 font-medium text-text-muted flex items-center gap-1 truncate max-w-[200px]">
                          <BookOpen size={12} />
                          <span className="truncate">{session.course.title}</span>
                        </span>
                      )}
                    </div>

                    {/* Title and Description */}
                    <div>
                      <h3 className="text-18 font-bold text-text">{session.title}</h3>
                      {session.description && (
                        <p className="text-13 text-text-muted mt-1.5 line-clamp-2 leading-relaxed">
                          {session.description}
                        </p>
                      )}
                    </div>

                    {/* Time & Attendance */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-12 text-text-muted">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span>
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-primary" />
                        <span>
                          {session.registrationCount || 0} registered ({session.durationMinutes}m)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                    <div>
                      {session.isRegistered ? (
                        <span className="inline-flex items-center gap-1 text-12 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} />
                          <span>You are registered</span>
                        </span>
                      ) : !isEnded && !isStaff ? (
                        <button
                          onClick={() => handleRegister(session.id)}
                          disabled={registeringId === session.id}
                          className="text-13 font-semibold text-primary hover:underline"
                        >
                          {registeringId === session.id ? 'Registering...' : '+ Register to Attend'}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/live/${session.id}`}
                        className={`py-2 px-4 rounded-xl font-bold text-13 flex items-center gap-2 transition-all shadow-sm ${
                          isLive
                            ? 'bg-danger text-white hover:bg-danger/90 animate-bounce'
                            : canJoinNow
                            ? 'bg-primary text-[#0A1628] hover:bg-primary-hover'
                            : 'bg-surface-hover text-text hover:bg-border'
                        }`}
                      >
                        <Video size={15} />
                        <span>{isLive ? 'Join Live Now' : canJoinNow ? 'Enter Room' : 'View Session'}</span>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Live Class Modal (Instructors/Admins) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-18 font-bold text-text">Schedule Live Session</h3>
              <p className="text-12 text-text-muted">
                Create a live video class with an automated Jitsi Meet room.
              </p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-12 font-medium text-text mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Live System Architecture Deep Dive"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-14 text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-12 font-medium text-text mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="What will learners practice and discuss in this session?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-13 text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-12 font-medium text-text mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    max="360"
                    step="15"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-13 text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-12 font-medium text-text mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduledAt}
                  onChange={(e) => setNewScheduledAt(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-13 text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scheduling}
                  className="bg-primary text-[#0A1628] hover:bg-primary-hover font-bold"
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Class'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
