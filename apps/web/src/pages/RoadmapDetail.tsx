import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { api } from '../lib/api';
import {
  Roadmap,
  RoadmapTopic,
  RoadmapStage,
  Certificate,
  LiveSession,
  DiscussionThread,
} from '@learnstack/shared';
import confetti from 'canvas-confetti';
import { formatCourseTitle } from './RoadmapsList';
import { trackEvent } from '../lib/analytics';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  HelpCircle,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Terminal,
  Cloud,
  BookOpen,
  AlertCircle,
  Layers,
  Lock,
  CreditCard,
  Sparkles,
  Award,
  Video,
  MessageSquare,
  Send,
  Check,
  ArrowRight,
} from 'lucide-react';

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    } else if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    // Return original url as fallback
  }
  return url;
}

export const RoadmapDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<{
    lesson: RoadmapTopic;
    module: RoadmapStage;
  } | null>(null);
  const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [claimedCert, setClaimedCert] = useState<Certificate | null>(null);
  const [claimingCert, setClaimingCert] = useState(false);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [drawerTab, setDrawerTab] = useState<'content' | 'discussion'>('content');
  const [lessonDiscussions, setLessonDiscussions] = useState<DiscussionThread[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [postingQuestion, setPostingQuestion] = useState(false);

  const handleEnroll = async () => {
    if (!slug) return;
    try {
      setEnrolling(true);
      const res = await api.post<{ url?: string; enrolled?: boolean }>('/v1/courses/' + slug + '/checkout');
      if (res.url) {
        window.location.href = res.url;
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate enrollment checkout');
    } finally {
      setEnrolling(false);
    }
  };

  const handleClaimCertificate = async () => {
    if (!slug) return;
    try {
      setClaimingCert(true);
      const res = await api.post<{ certificate: Certificate; alreadyClaimed: boolean }>(
        `/v1/courses/${slug}/claim-certificate`
      );
      setClaimedCert(res.certificate);
      // Trigger celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert(err.message || 'Failed to claim certificate');
    } finally {
      setClaimingCert(false);
    }
  };

  useEffect(() => {
    async function fetchCourse() {
      if (!slug) return;
      try {
        setLoading(true);
        const [data, certs] = await Promise.all([
          api.get<Roadmap>(`/v1/roadmaps/${slug}`),
          api.get<Certificate[]>('/v1/certificates').catch(() => []),
        ]);
        setCourse(data);
        if (data.stages && data.stages.length > 0) {
          // Default: expand all modules for easy scanning
          setExpandedModules(new Set(data.stages.map((s) => s.id)));
        }
        const existingCert = certs.find((c) => c.courseId === data.id);
        if (existingCert) {
          setClaimedCert(existingCert);
        }

        // Fetch upcoming live sessions for this course
        if (data.id) {
          const sessions = await api.get<LiveSession[]>(`/v1/live-sessions?courseId=${data.id}`).catch(() => []);
          setLiveSessions(sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'LIVE'));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [slug]);

  useEffect(() => {
    if (!selectedLesson) return;
    const lessonId = selectedLesson.lesson.id;
    setDrawerTab('content');
    async function loadDiscussions() {
      try {
        setLoadingDiscussions(true);
        const data = await api.get<DiscussionThread[]>(
          `/v1/discussions?lessonId=${lessonId}`
        );
        setLessonDiscussions(data);
      } catch (err) {
        console.error('Failed to load lesson discussions:', err);
      } finally {
        setLoadingDiscussions(false);
      }
    }
    loadDiscussions();
  }, [selectedLesson?.lesson.id]);

  const handlePostLessonQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson || !newQuestionTitle.trim() || !newQuestionContent.trim() || !course) return;
    try {
      setPostingQuestion(true);
      const created = await api.post<DiscussionThread>('/v1/discussions', {
        title: newQuestionTitle.trim(),
        content: newQuestionContent.trim(),
        lessonId: selectedLesson.lesson.id,
        courseId: course.id,
      });
      setLessonDiscussions((prev) => [created, ...prev]);
      setNewQuestionTitle('');
      setNewQuestionContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to post question');
    } finally {
      setPostingQuestion(false);
    }
  };

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Handle toggling complete on lesson
  const handleToggleComplete = async (
    lessonId: string,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    if (!slug || updatingLessonId) return;

    // Spec 09: Check if lesson is gated by an unpassed quiz
    const targetLesson = course?.stages
      ?.flatMap((s) => s.topics)
      .find((t) => t.id === lessonId);

    if (targetLesson?.quizId && !targetLesson.passed && !targetLesson.completed) {
      const targetModule = course?.stages?.find((s) =>
        s.topics.some((t) => t.id === lessonId)
      );
      if (targetModule) {
        setSelectedLesson({ lesson: targetLesson, module: targetModule });
      }
      return;
    }

    try {
      setUpdatingLessonId(lessonId);
      const res = await api.post<{
        success: boolean;
        topicId: string;
        completed: boolean;
      }>(`/v1/roadmaps/${slug}/topics/${lessonId}/complete`);

      if (res.completed) {
        trackEvent('lesson_completed', {
          courseId: course?.id,
          lessonId,
        });
      }

      // Update state locally
      setCourse((prev) => {
        if (!prev || !prev.stages) return prev;

        let totalCompleted = 0;
        let totalCount = 0;

        const updatedStages = prev.stages.map((stage) => {
          let stageCompleted = 0;
          const updatedTopics = stage.topics.map((t) => {
            const isCompleted = t.id === lessonId ? res.completed : !!t.completed;
            if (isCompleted) stageCompleted++;
            return { ...t, completed: isCompleted };
          });

          totalCompleted += stageCompleted;
          totalCount += stage.topics.length;

          const stagePercent =
            stage.topics.length > 0
              ? Math.round((stageCompleted / stage.topics.length) * 100)
              : 0;

          return {
            ...stage,
            completedTopics: stageCompleted,
            percentComplete: stagePercent,
            topics: updatedTopics,
          };
        });

        const overallPercent =
          totalCount > 0 ? Math.round((totalCompleted / totalCount) * 100) : 0;

        return {
          ...prev,
          completedTopics: totalCompleted,
          percentComplete: overallPercent,
          stages: updatedStages,
        };
      });

      // Also update selectedLesson if currently open
      if (selectedLesson && selectedLesson.lesson.id === lessonId) {
        setSelectedLesson({
          ...selectedLesson,
          lesson: { ...selectedLesson.lesson, completed: res.completed },
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle completion:', err);
    } finally {
      setUpdatingLessonId(null);
    }
  };

  const getCourseIcon = (slugName?: string) => {
    if (slugName === 'devops') return <Terminal className="w-5 h-5 text-primary" />;
    if (slugName === 'cloud') return <Cloud className="w-5 h-5 text-primary" />;
    return <BookOpen className="w-5 h-5 text-primary" />;
  };

  const embedUrl = useMemo(() => {
    return getYouTubeEmbedUrl(selectedLesson?.lesson.youtubeUrl);
  }, [selectedLesson]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton height="30px" className="w-48" />
          <Skeleton height="110px" className="rounded-xl" />
          <Skeleton height="450px" className="rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (error || !course) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-8 bg-surface border border-border rounded-xl text-center space-y-4 shadow-sm">
          <p className="text-danger font-medium">{error || 'Course not found'}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-primary hover:underline text-14 font-medium"
          >
            <ArrowLeft size={16} /> Back to Courses
          </Link>
        </div>
      </Layout>
    );
  }

  const overallPercent = course.percentComplete ?? 0;
  const overallTotal = course.totalTopics ?? 0;
  const overallCompleted = course.completedTopics ?? 0;
  const displayTitle = formatCourseTitle(course.title);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: 'Courses', to: '/courses' },
            { label: displayTitle },
          ]}
        />

        {/* Premium Enrollment Banner */}
        {!course.isEnrolled && !course.isFree && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-teal-500/10 to-primary/5 border border-primary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-14">
                <Sparkles size={16} />
                <span>Premium Course Enrollment</span>
              </div>
              <h3 className="text-20 font-bold text-text">Unlock Full Access to {displayTitle}</h3>
              <p className="text-14 text-text-muted">
                Enroll now to access all {overallTotal} lessons, interactive code examples, and pass-certified quizzes.
              </p>
            </div>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-[#0A1628] font-bold text-15 shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition-colors shrink-0"
            >
              <CreditCard size={18} />
              <span>{enrolling ? 'Connecting to Stripe...' : `Enroll Now for $${((course.priceCents || 0) / 100).toFixed(0)}`}</span>
            </button>
          </div>
        )}

        {/* Top Header Card with Overall Progress */}
        <Card className="p-6 bg-surface border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  {getCourseIcon(course.slug)}
                </div>
                <h1 className="text-24 font-bold text-text">{displayTitle}</h1>
              </div>
              <p className="text-14 text-text-muted">{course.description}</p>
            </div>

            {/* Overall Progress Gauge */}
            <div className="w-full md:w-64 p-4 rounded-xl bg-surface-hover/60 border border-border space-y-2 shrink-0">
              <div className="flex items-center justify-between text-12">
                <span className="text-text-muted font-medium">Course Progress</span>
                <span className="font-bold text-primary text-14 font-mono">{overallPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
              <div className="text-11 text-text-muted text-right font-medium">
                {overallCompleted} of {overallTotal} lessons completed
              </div>
            </div>
          </div>
        </Card>

        {/* Course Completion & Certificate Banner */}
        {overallPercent === 100 && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-14">
                <Award size={18} />
                <span>Course Completed • 100% Mastery</span>
              </div>
              <h3 className="text-20 font-bold text-text">
                {claimedCert ? 'Official Certificate Earned!' : 'Congratulations! You Have Completed This Course'}
              </h3>
              <p className="text-14 text-text-muted">
                {claimedCert
                  ? `Your verifiable certificate of completion (${claimedCert.certificateNumber}) is ready to view, share, or download.`
                  : 'You have finished all lessons and passed all module quizzes. Claim your verifiable certificate of completion now!'}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {claimedCert ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/certificates"
                    className="px-5 py-2.5 rounded-xl bg-primary text-[#0A1628] hover:bg-primary-hover font-bold text-14 flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Award size={16} />
                    <span>View in Certificates</span>
                  </Link>
                  <a
                    href={claimedCert.pdfUrl || `/v1/certificates/${claimedCert.certificateNumber}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text font-semibold text-14 transition-colors"
                  >
                    PDF
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleClaimCertificate}
                  disabled={claimingCert}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-15 shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Award size={18} />
                  <span>{claimingCert ? 'Generating Certificate...' : 'Claim Certificate 🎓'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content & Side Panel Split */}
        <div className="flex flex-col lg:flex-row gap-6 relative items-start">
          {/* Module Accordion */}
          <div
            className={`flex-1 space-y-4 w-full transition-all duration-300 ${
              selectedLesson ? 'lg:max-w-[58%]' : 'w-full'
            }`}
          >
            {/* Upcoming Live Sessions for this Course (Spec 14) */}
            {liveSessions.length > 0 && (
              <div className="p-5 rounded-xl bg-surface border border-border space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-primary" />
                    <h3 className="text-15 font-bold text-text">Upcoming Live Classes</h3>
                  </div>
                  <Link to="/live" className="text-12 text-primary hover:underline font-medium">
                    View all classes
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {liveSessions.slice(0, 2).map((s) => {
                    const isLive = s.status === 'LIVE';
                    return (
                      <div
                        key={s.id}
                        className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isLive
                            ? 'bg-danger/5 border-danger/30'
                            : 'bg-surface-hover/50 border-border'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30 animate-pulse">
                                LIVE NOW
                              </span>
                            ) : (
                              <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                {new Date(s.scheduledAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })} • {new Date(s.scheduledAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            <h4 className="text-13 font-bold text-text">{s.title}</h4>
                          </div>
                        </div>
                        <Link
                          to={`/live/${s.id}`}
                          className={`px-3 py-1.5 rounded-lg text-12 font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                            isLive
                              ? 'bg-danger text-white hover:bg-danger/90'
                              : 'bg-primary text-[#0A1628] hover:bg-primary-hover'
                          }`}
                        >
                          <Video size={13} />
                          <span>{isLive ? 'Join Room' : s.isRegistered ? 'Enter Room' : 'View Session'}</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {course.stages?.map((module, moduleIdx) => {
              const modulePercent = module.percentComplete ?? 0;
              const moduleTotal = module.totalTopics ?? module.topics.length;
              const moduleCompleted =
                module.completedTopics ??
                module.topics.filter((t) => t.completed).length;
              const isExpanded = expandedModules.has(module.id);

              return (
                <div
                  key={module.id}
                  className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm transition-all"
                >
                  {/* Module Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleModuleAccordion(module.id)}
                    className="w-full p-4.5 flex items-center justify-between hover:bg-surface-hover/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center font-bold text-13 text-text shrink-0">
                        {moduleIdx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-11 font-mono text-primary uppercase tracking-wider font-semibold">
                            Module {moduleIdx + 1}
                          </span>
                        </div>
                        <h2 className="text-16 font-bold text-text truncate">
                          {module.title}
                        </h2>
                        <span className="text-12 text-text-muted mt-0.5 block">
                          {moduleCompleted} of {moduleTotal} lessons completed
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300 rounded-full"
                            style={{ width: `${modulePercent}%` }}
                          />
                        </div>
                        <span className="text-12 font-bold font-mono text-text-muted">
                          {modulePercent}%
                        </span>
                      </div>
                      <div className="p-1 rounded-md text-text-muted">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>
                  </button>

                  {/* Module Lessons (Accordion Content) */}
                  {isExpanded && (
                    <div className="border-t border-border/70 p-4 space-y-2.5 bg-surface/40">
                      {module.topics.map((lesson) => {
                        const isSelected = selectedLesson?.lesson.id === lesson.id;
                        const isCompleted = !!lesson.completed;

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              setSelectedLesson({ lesson, module });
                              trackEvent('lesson_started', {
                                courseId: course?.id,
                                lessonId: lesson.id,
                              });
                            }}
                            className={`group relative flex items-start gap-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary/5 border-primary shadow-sm'
                                : isCompleted
                                ? 'bg-surface/80 border-border/80 hover:border-border'
                                : 'bg-surface border-border hover:border-border-hover'
                            }`}
                          >
                            {/* Checkbox or Lock Icon */}
                            {lesson.locked ? (
                              <div className="mt-0.5 text-amber-500 shrink-0" title="Enrollment required to unlock">
                                <Lock className="w-4 h-4" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleToggleComplete(lesson.id, e)}
                                disabled={updatingLessonId === lesson.id}
                                className="mt-0.5 text-text-muted hover:text-primary transition-colors focus:outline-none shrink-0"
                                title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-primary fill-primary/10" />
                                ) : (
                                  <Circle className="w-5 h-5 text-text-muted/60 group-hover:text-primary transition-colors" />
                                )}
                              </button>
                            )}

                            {/* Lesson Content */}
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`text-14 font-medium transition-colors ${
                                    isCompleted
                                      ? 'text-text-muted line-through decoration-border'
                                      : 'text-text group-hover:text-primary'
                                  }`}
                                >
                                  {lesson.title}
                                </h3>
                              </div>
                              {lesson.description && (
                                <p className="text-12 text-text-muted mt-1 line-clamp-2">
                                  {lesson.description}
                                </p>
                              )}
                            </div>

                            {/* Meta Badges */}
                            <div className="flex items-center gap-1.5 shrink-0 self-center">
                              {lesson.youtubeUrl && (
                                <span
                                  className="p-1 rounded text-text-muted hover:text-primary"
                                  title="Video lesson available"
                                >
                                  <PlayCircle size={16} />
                                </span>
                              )}
                              {lesson.quizId && (
                                <span
                                  className="p-1 rounded text-text-muted hover:text-primary"
                                  title="Lesson quiz available"
                                >
                                  <HelpCircle size={16} />
                                </span>
                              )}
                              <ChevronRight
                                size={16}
                                className={`text-text-muted/40 transition-transform ${
                                  isSelected ? 'text-primary translate-x-0.5' : 'group-hover:translate-x-0.5'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Side Panel / Drawer */}
          {selectedLesson && (
            <div className="w-full lg:w-[42%] lg:sticky lg:top-20 shrink-0">
              <Card className="p-6 bg-surface border-border space-y-5 shadow-lg">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <span className="text-11 font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Layers size={13} />
                      <span>{selectedLesson.module.title}</span>
                    </span>
                    <h2 className="text-18 font-bold text-text mt-1">
                      {selectedLesson.lesson.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Tab Switcher */}
                <div className="flex items-center bg-surface-hover/80 p-1 rounded-xl border border-border text-12 font-medium">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('content')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
                      drawerTab === 'content'
                        ? 'bg-surface text-text font-bold shadow-xs'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Lesson Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('discussion')}
                    className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      drawerTab === 'discussion'
                        ? 'bg-surface text-text font-bold shadow-xs'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <MessageSquare size={13} />
                    <span>Discussion ({lessonDiscussions.length})</span>
                  </button>
                </div>

                {/* Lesson Locked State or Content */}
                {selectedLesson.lesson.locked ? (
                  <div className="py-8 px-4 rounded-xl bg-surface-hover/60 border border-border text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/20">
                      <Lock size={28} />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <h3 className="text-16 font-bold text-text">Lesson Locked</h3>
                      <p className="text-13 text-text-muted mt-1 leading-relaxed">
                        This lesson is part of a premium course. Enroll now to unlock all modules, video lessons, and interactive quizzes.
                      </p>
                    </div>
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 px-4 rounded-xl bg-primary text-[#0A1628] hover:bg-primary-hover font-bold text-14 shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <CreditCard size={16} />
                      <span>
                        {enrolling
                          ? 'Redirecting to checkout...'
                          : `Enroll Now ${course.priceCents ? `• $${(course.priceCents / 100).toFixed(2)}` : '• $49.00'}`}
                      </span>
                    </button>
                  </div>
                ) : drawerTab === 'discussion' ? (
                  /* Discussion Tab Content */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-13 font-bold text-text flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-primary" />
                        <span>Lesson Questions & Answers</span>
                      </h3>
                      <Link
                        to={`/discussions?courseId=${course.id}`}
                        className="text-11 text-primary hover:underline font-medium flex items-center gap-0.5"
                      >
                        <span>All Course Discussions</span>
                        <ExternalLink size={10} />
                      </Link>
                    </div>

                    {/* Ask Question Form */}
                    <form onSubmit={handlePostLessonQuestion} className="p-3.5 rounded-xl bg-surface-hover/50 border border-border space-y-2.5">
                      <h4 className="text-12 font-bold text-text">Ask a Question on this Lesson</h4>
                      <input
                        type="text"
                        required
                        placeholder="Brief summary of your question..."
                        value={newQuestionTitle}
                        onChange={(e) => setNewQuestionTitle(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-13 text-text focus:outline-none focus:border-primary"
                      />
                      <textarea
                        rows={2}
                        required
                        placeholder="Details or code snippets..."
                        value={newQuestionContent}
                        onChange={(e) => setNewQuestionContent(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg p-2.5 text-12 text-text focus:outline-none focus:border-primary"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={postingQuestion || !newQuestionTitle.trim() || !newQuestionContent.trim()}
                          className="py-1.5 px-3 rounded-lg bg-primary text-[#0A1628] hover:bg-primary-hover font-bold text-12 flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Send size={12} />
                          <span>{postingQuestion ? 'Posting...' : 'Ask Question'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Thread List */}
                    {loadingDiscussions ? (
                      <div className="space-y-2">
                        <Skeleton height="60px" className="rounded-lg" />
                        <Skeleton height="60px" className="rounded-lg" />
                      </div>
                    ) : lessonDiscussions.length === 0 ? (
                      <div className="p-6 rounded-xl bg-surface-hover/30 border border-border text-center space-y-2">
                        <p className="text-13 text-text-muted">No questions asked on this lesson yet.</p>
                        <p className="text-11 text-text-muted">Have a doubt? Ask above and instructors will answer!</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {lessonDiscussions.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-lg bg-surface border border-border hover:border-primary/40 transition-colors space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-13 font-bold text-text truncate">{t.title}</h5>
                              {t.hasAcceptedAnswer && (
                                <span className="inline-flex items-center gap-0.5 text-10 font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                                  <Check size={10} />
                                  <span>Answered</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-11 text-text-muted pt-1 border-t border-border/60">
                              <span>{t.author?.name || 'Student'}</span>
                              <Link
                                to={`/discussions?thread=${t.id}`}
                                className="text-primary hover:underline font-semibold flex items-center gap-1"
                              >
                                <span>{t.postCount || 1} posts</span>
                                <ArrowRight size={11} />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Video Embed */}
                    {embedUrl ? (
                      <div className="space-y-2">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border border-border">
                          <iframe
                            src={embedUrl}
                            title={selectedLesson.lesson.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                        {selectedLesson.lesson.youtubeUrl && (
                          <div className="flex justify-end">
                            <a
                              href={selectedLesson.lesson.youtubeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-12 text-text-muted hover:text-primary transition-colors font-medium"
                            >
                              <span>Open on YouTube</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 rounded-lg bg-surface-hover/50 border border-border text-center text-text-muted text-13">
                        No video linked for this lesson.
                      </div>
                    )}

                    {/* Description */}
                    {selectedLesson.lesson.description && (
                      <div className="space-y-1.5">
                        <h3 className="text-12 font-semibold text-text-muted uppercase tracking-wider">
                          Lesson Overview
                        </h3>
                        <p className="text-14 text-text leading-relaxed">
                          {selectedLesson.lesson.description}
                        </p>
                      </div>
                    )}

                    {/* Quiz Section (Spec 09) */}
                    {selectedLesson.lesson.quizId && (
                      <div className="pt-4 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-12 font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                            <HelpCircle size={14} className="text-primary" />
                            <span>Lesson Quiz</span>
                          </h3>
                          {selectedLesson.lesson.passed ? (
                            <span className="text-11 font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              <span>Passed ({selectedLesson.lesson.userBestScore}%)</span>
                            </span>
                          ) : selectedLesson.lesson.userBestScore !== null ? (
                            <span className="text-11 font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 flex items-center gap-1">
                              <AlertCircle size={12} />
                              <span>Needs 70% (Best: {selectedLesson.lesson.userBestScore}%)</span>
                            </span>
                          ) : (
                            <span className="text-11 font-medium px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border">
                              10 Questions • 70%+ to pass
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-lg bg-surface-hover/60 border border-border space-y-2.5">
                          <div>
                            <p className="font-semibold text-13 text-text">
                              {selectedLesson.lesson.quizTitle || selectedLesson.lesson.title}
                            </p>
                            <p className="text-12 text-text-muted mt-0.5">
                              {selectedLesson.lesson.passed
                                ? `You have passed this quiz with a best score of ${selectedLesson.lesson.userBestScore}%. You can retake it anytime.`
                                : selectedLesson.lesson.userBestScore !== null
                                ? `Your current best score is ${selectedLesson.lesson.userBestScore}%. Pass with 70%+ to unlock completion.`
                                : 'Pass this 10-question quiz (70%+ required) to unlock lesson completion.'}
                            </p>
                          </div>

                          <Link
                            to={`/quizzes/${selectedLesson.lesson.quizId}?from=course&courseSlug=${slug}&topicId=${selectedLesson.lesson.id}`}
                            className={`w-full py-2.5 px-3 rounded-lg font-medium text-13 flex items-center justify-center gap-2 transition-colors ${
                              selectedLesson.lesson.passed
                                ? 'bg-surface hover:bg-surface-hover text-text border border-border shadow-sm'
                                : 'bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold shadow-sm'
                            }`}
                          >
                            <HelpCircle size={15} />
                            <span>
                              {selectedLesson.lesson.passed
                                ? 'Retake Quiz'
                                : selectedLesson.lesson.userBestScore !== null
                                ? 'Retake Quiz to Pass'
                                : 'Take Quiz'}
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-border space-y-2">
                      {selectedLesson.lesson.quizId &&
                      !selectedLesson.lesson.passed &&
                      !selectedLesson.lesson.completed ? (
                        <div className="space-y-2">
                          <button
                            disabled
                            className="w-full py-2.5 px-4 rounded-lg font-medium text-14 flex items-center justify-center gap-2 bg-surface-hover text-text-muted/60 border border-border/60 cursor-not-allowed"
                          >
                            <CheckCircle2 size={16} />
                            <span>Mark as Complete (Locked)</span>
                          </button>
                          <p className="text-12 text-center text-warning flex items-center justify-center gap-1.5 font-medium">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>Take quiz to unlock completion</span>
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleComplete(selectedLesson.lesson.id)}
                          disabled={updatingLessonId === selectedLesson.lesson.id}
                          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-14 flex items-center justify-center gap-2 transition-colors ${
                            selectedLesson.lesson.completed
                              ? 'bg-surface text-text-muted hover:bg-surface-hover border border-border'
                              : 'bg-primary text-[#0A1628] hover:bg-primary-hover shadow-sm'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                          <span>
                            {selectedLesson.lesson.completed
                              ? 'Completed (Click to undo)'
                              : 'Mark as Complete'}
                          </span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export const CourseDetail = RoadmapDetail;
