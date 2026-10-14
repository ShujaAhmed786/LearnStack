import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { apiFetch } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  AnalyticsOverviewResponse,
  CourseFunnelResponse,
  CourseQuizzesResponse,
  AtRiskLearnersResponse,
  EngagementResponse,
  Roadmap,
} from '@learnstack/shared';
import {
  Users,
  TrendingUp,
  Award,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  Send,
  HelpCircle,
  Clock,
  Filter,
  Layers,
  ChevronDown,
  Calendar,
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'quizzes' | 'at-risk'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics Data
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [engagement, setEngagement] = useState<EngagementResponse | null>(null);
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>('');
  const [funnel, setFunnel] = useState<CourseFunnelResponse | null>(null);
  const [quizzes, setQuizzes] = useState<CourseQuizzesResponse | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskLearnersResponse | null>(null);

  // States for sub-interactions
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [onlyHardQuestions, setOnlyHardQuestions] = useState(false);
  const [nudgedLearners, setNudgedLearners] = useState<Set<string>>(new Set());
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; activeLearners: number } | null>(null);

  // Initial Load: Overview, Engagement, Courses, At-Risk
  useEffect(() => {
    async function loadInitialAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const [ovData, engData, coursesData, atRiskData] = await Promise.all([
          apiFetch<AnalyticsOverviewResponse>('/v1/admin/analytics/overview'),
          apiFetch<EngagementResponse>('/v1/admin/analytics/engagement'),
          apiFetch<Roadmap[]>('/v1/roadmaps'),
          apiFetch<AtRiskLearnersResponse>('/v1/admin/analytics/at-risk'),
        ]);

        setOverview(ovData);
        setEngagement(engData);
        setCourses(coursesData);
        setAtRisk(atRiskData);

        if (coursesData.length > 0) {
          setSelectedCourseSlug(coursesData[0].slug);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    loadInitialAnalytics();
  }, []);

  // Fetch Funnel when tab is funnel or course changes
  useEffect(() => {
    if (!selectedCourseSlug) return;
    async function loadFunnel() {
      try {
        setLoadingFunnel(true);
        const data = await apiFetch<CourseFunnelResponse>(
          `/v1/admin/analytics/courses/${selectedCourseSlug}/funnel`
        );
        setFunnel(data);
      } catch (err) {
        console.error('Failed to load funnel:', err);
      } finally {
        setLoadingFunnel(false);
      }
    }

    if (activeTab === 'funnel' || activeTab === 'overview') {
      loadFunnel();
    }
  }, [selectedCourseSlug, activeTab]);

  // Fetch Quizzes when tab is quizzes or course changes
  useEffect(() => {
    if (!selectedCourseSlug) return;
    async function loadQuizzes() {
      try {
        setLoadingQuizzes(true);
        const data = await apiFetch<CourseQuizzesResponse>(
          `/v1/admin/analytics/courses/${selectedCourseSlug}/quizzes`
        );
        setQuizzes(data);
      } catch (err) {
        console.error('Failed to load quizzes:', err);
      } finally {
        setLoadingQuizzes(false);
      }
    }

    if (activeTab === 'quizzes') {
      loadQuizzes();
    }
  }, [selectedCourseSlug, activeTab]);

  // Handle Nudge Action
  const handleNudge = async (userId: string) => {
    try {
      await apiFetch(`/v1/admin/analytics/nudge/${userId}`, { method: 'POST' });
      setNudgedLearners((prev) => new Set(prev).add(userId));
    } catch (err) {
      showToast('Failed to send nudge', 'error');
    }
  };

  // Helper for 30-day SVG chart calculations
  const chartDays = engagement?.days || [];
  const maxActive = Math.max(1, ...chartDays.map((d) => d.activeLearners));
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingY * 2;

  const points = chartDays.map((d, index) => {
    const x = paddingX + (index / (chartDays.length - 1 || 1)) * usableWidth;
    const y = svgHeight - paddingY - (d.activeLearners / maxActive) * usableHeight;
    return { x, y, date: d.date, activeLearners: d.activeLearners };
  });

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` +
      points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${
        svgHeight - paddingY
      } Z`
    : '';

  const totalEngagementInteractions = chartDays.reduce((acc, d) => acc + d.activeLearners, 0);
  const avgDailyActive = chartDays.length > 0 ? (totalEngagementInteractions / chartDays.length).toFixed(1) : '0';

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-28 font-bold text-text tracking-tight">
              Advanced Learning Analytics
            </h1>
            <p className="text-14 text-text-muted mt-1">
              Deep visibility into learner drop-off points, quiz difficulties, and at-risk learners.
            </p>
          </div>

          {/* Course Selector Pill (if on funnel or quizzes tab) */}
          {(activeTab === 'funnel' || activeTab === 'quizzes') && courses.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="course-select" className="text-13 text-text-muted font-medium whitespace-nowrap">
                Course:
              </label>
              <div className="relative">
                <select
                  id="course-select"
                  value={selectedCourseSlug}
                  onChange={(e) => setSelectedCourseSlug(e.target.value)}
                  className="appearance-none bg-surface border border-border rounded-lg pl-3 pr-8 py-2 text-13 font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-14 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
            }`}
          >
            <TrendingUp size={16} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('funnel')}
            className={`px-4 py-2.5 text-14 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'funnel'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
            }`}
          >
            <Layers size={16} />
            <span>Course Funnel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quizzes')}
            className={`px-4 py-2.5 text-14 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'quizzes'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
            }`}
          >
            <HelpCircle size={16} />
            <span>Quiz Difficulty</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('at-risk')}
            className={`px-4 py-2.5 text-14 font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'at-risk'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-border'
            }`}
          >
            <AlertTriangle size={16} />
            <span>At-Risk Learners</span>
            {atRisk && atRisk.atRiskCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-11 font-bold bg-danger/10 text-danger border border-danger/20">
                {atRisk.atRiskCount}
              </span>
            )}
          </button>
        </div>

        {/* Global Loading State */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height="100px" className="rounded-xl" />
              ))}
            </div>
            <Skeleton height="320px" className="rounded-xl" />
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl text-danger text-14">
            {error}
          </div>
        ) : (
          <>
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* 5 KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-12 font-medium uppercase tracking-wider">Total Learners</span>
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="mt-3">
                      <span className="font-heading text-28 font-bold text-text">
                        {overview?.totalLearners ?? 0}
                      </span>
                      <span className="text-12 text-text-muted block mt-0.5">Enrolled across organization</span>
                    </div>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-12 font-medium uppercase tracking-wider">Active This Week</span>
                      <TrendingUp className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="mt-3">
                      <span className="font-heading text-28 font-bold text-teal-600 dark:text-teal-400">
                        {overview?.activeThisWeek ?? 0}
                      </span>
                      <span className="text-12 text-text-muted block mt-0.5">Distinct active past 7 days</span>
                    </div>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-12 font-medium uppercase tracking-wider">Avg Completion</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-3">
                      <span className="font-heading text-28 font-bold text-text">
                        {overview?.avgCompletionRate ?? 0}%
                      </span>
                      <span className="text-12 text-text-muted block mt-0.5">Across all enrolled modules</span>
                    </div>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-12 font-medium uppercase tracking-wider">Avg Quiz Score</span>
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-3">
                      <span className="font-heading text-28 font-bold text-text">
                        {overview?.avgQuizScore ?? 0}%
                      </span>
                      <span className="text-12 text-text-muted block mt-0.5">Overall assessment average</span>
                    </div>
                  </Card>

                  <Card className="p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-12 font-medium uppercase tracking-wider">Lessons Done</span>
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="mt-3">
                      <span className="font-heading text-28 font-bold text-text">
                        {overview?.totalLessonsCompleted ?? 0}
                      </span>
                      <span className="text-12 text-text-muted block mt-0.5">Total completed steps</span>
                    </div>
                  </Card>
                </div>

                {/* 30-Day Engagement Chart */}
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h2 className="font-heading text-18 font-bold text-text">
                        30-Day Daily Active Learners
                      </h2>
                      <p className="text-13 text-text-muted mt-0.5">
                        Interactive engagement trends over the last month
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-13 text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                        <span>Daily Active</span>
                      </div>
                      <div className="font-medium text-text">
                        Avg: <span className="text-primary font-bold">{avgDailyActive}</span> / day
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart Container */}
                  <div className="relative w-full overflow-hidden">
                    <svg
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                      className="w-full h-auto overflow-visible select-none"
                    >
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = paddingY + ratio * usableHeight;
                        const labelValue = Math.round(maxActive * (1 - ratio));
                        return (
                          <g key={ratio}>
                            <line
                              x1={paddingX}
                              y1={y}
                              x2={svgWidth - paddingX}
                              y2={y}
                              stroke="currentColor"
                              className="text-border/60"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={paddingX - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-text-muted text-[10px] font-mono"
                            >
                              {labelValue}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {areaD && <path d={areaD} fill="url(#primaryGradient)" />}

                      {/* Line Stroke */}
                      {pathD && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#14B8A6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Dots and interactive hover targets */}
                      {points.map((p, idx) => (
                        <g key={idx} className="cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint?.date === p.date ? 5 : 3}
                            className="fill-primary stroke-surface stroke-2 transition-all"
                          />
                          {/* Invisible larger hover hitbox */}
                          <rect
                            x={p.x - 10}
                            y={paddingY}
                            width="20"
                            height={usableHeight}
                            fill="transparent"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}

                      {/* X-axis dates (sample every 5 days) */}
                      {points.map((p, idx) => {
                        if (idx % 5 !== 0 && idx !== points.length - 1) return null;
                        const label = p.date.slice(5); // MM-DD
                        return (
                          <text
                            key={idx}
                            x={p.x}
                            y={svgHeight - 8}
                            textAnchor="middle"
                            className="fill-text-muted text-[10px] font-mono"
                          >
                            {label}
                          </text>
                        );
                      })}
                    </svg>

                    {/* Tooltip Overlay */}
                    {hoveredPoint && (
                      <div className="absolute top-2 right-4 bg-surface border border-border rounded-lg shadow-md px-3 py-1.5 text-12 font-medium flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span className="text-text">{hoveredPoint.date}:</span>
                        <span className="text-primary font-bold">
                          {hoveredPoint.activeLearners} active learner
                          {hoveredPoint.activeLearners === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB: COURSE FUNNEL */}
            {activeTab === 'funnel' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
                    <div>
                      <h2 className="font-heading text-20 font-bold text-text">
                        {funnel?.courseTitle || 'Course Funnel Drop-off'}
                      </h2>
                      <p className="text-13 text-text-muted mt-1">
                        Track learner completion rates step-by-step from module introduction to final lesson.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-13">
                        <span className="text-text-muted">Total Enrolled: </span>
                        <span className="font-bold text-text font-mono">
                          {funnel?.totalEnrolled ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {loadingFunnel ? (
                    <div className="py-12 space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height="60px" className="rounded-lg" />
                      ))}
                    </div>
                  ) : !funnel || funnel.lessons.length === 0 ? (
                    <div className="py-16 text-center text-text-muted">
                      <Layers className="w-10 h-10 mx-auto mb-3 opacity-40 text-primary" />
                      <p className="text-15 font-medium">No lesson data available for this course yet.</p>
                      <p className="text-13 mt-1">Learners will appear here as they interact with course materials.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {funnel.lessons.map((lesson, idx) => {
                        const prevLesson = idx > 0 ? funnel.lessons[idx - 1] : null;
                        const dropOff =
                          prevLesson && prevLesson.completed > 0
                            ? Math.round(
                                ((prevLesson.completed - lesson.started) / prevLesson.completed) * 100
                              )
                            : 0;

                        const isHighDropOff = dropOff >= 25;

                        return (
                          <div
                            key={lesson.lessonId}
                            className="p-4 rounded-xl border border-border bg-surface hover:border-border-hover transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-12 font-bold font-mono flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <h3 className="text-14 font-semibold text-text">
                                    {lesson.title}
                                  </h3>
                                  <div className="flex items-center gap-3 text-12 text-text-muted mt-0.5">
                                    <span>
                                      Started: <strong className="text-text font-mono">{lesson.started}</strong>
                                    </span>
                                    <span>&bull;</span>
                                    <span>
                                      Completed: <strong className="text-text font-mono">{lesson.completed}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                {/* Time Spent Badge */}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-elevated text-11 text-text-muted border border-border">
                                  <Clock size={12} />
                                  <span>{Math.floor(lesson.avgTimeSpent / 60)}m {lesson.avgTimeSpent % 60}s avg</span>
                                </span>

                                {/* Drop-off alert badge if high */}
                                {idx > 0 && dropOff > 0 && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-11 font-medium ${
                                      isHighDropOff
                                        ? 'bg-danger/10 text-danger border border-danger/20'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    -{dropOff}% drop-off
                                  </span>
                                )}

                                {/* Completion Rate Pill */}
                                <span className="font-heading font-bold text-14 text-text min-w-[50px] text-right">
                                  {lesson.completionRate}%
                                </span>
                              </div>
                            </div>

                            {/* Progress bar visual */}
                            <div className="w-full bg-border/40 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  lesson.completionRate >= 70
                                    ? 'bg-emerald-500'
                                    : lesson.completionRate >= 40
                                    ? 'bg-primary'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(4, lesson.completionRate))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* TAB: QUIZ DIFFICULTY */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
                    <div>
                      <h2 className="font-heading text-20 font-bold text-text">
                        Quiz Difficulty Breakdown
                      </h2>
                      <p className="text-13 text-text-muted mt-1">
                        Assess question clarity and identify questions with low pass rates (&lt;40% correct).
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOnlyHardQuestions(!onlyHardQuestions)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-12 font-medium transition-colors ${
                          onlyHardQuestions
                            ? 'bg-danger/10 text-danger border-danger/30'
                            : 'bg-surface border-border text-text-muted hover:text-text'
                        }`}
                      >
                        <Filter size={13} />
                        <span>Only Hard Questions (&lt;40%)</span>
                      </button>
                    </div>
                  </div>

                  {loadingQuizzes ? (
                    <div className="py-12 space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} height="80px" className="rounded-lg" />
                      ))}
                    </div>
                  ) : !quizzes || quizzes.quizzes.length === 0 ? (
                    <div className="py-16 text-center text-text-muted">
                      <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-primary" />
                      <p className="text-15 font-medium">No quiz attempts recorded for this course yet.</p>
                      <p className="text-13 mt-1">Quiz analytics will populate as learners submit responses.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-8">
                      {quizzes.quizzes.map((quiz) => {
                        const displayedQuestions = onlyHardQuestions
                          ? quiz.hardestQuestions.filter((q) => q.correctRate < 40)
                          : quiz.hardestQuestions;

                        return (
                          <div key={quiz.quizId} className="border border-border rounded-xl p-5 bg-surface space-y-4">
                            {/* Quiz Overview Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
                              <div>
                                <h3 className="font-heading text-16 font-bold text-text">
                                  {quiz.title}
                                </h3>
                                <div className="flex items-center gap-4 text-12 text-text-muted mt-1">
                                  <span>
                                    Attempts: <strong className="text-text font-mono">{quiz.attempts}</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Avg Score: <strong className="text-text font-mono">{quiz.avgScore}%</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Pass Rate: <strong className="text-text font-mono">{quiz.passRate}%</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Questions List */}
                            {displayedQuestions.length === 0 ? (
                              <p className="text-13 text-text-muted italic py-2">
                                {onlyHardQuestions
                                  ? 'No questions with <40% correct rate found in this quiz.'
                                  : 'No questions available.'}
                              </p>
                            ) : (
                              <div className="space-y-3 pt-1">
                                {displayedQuestions.map((q, qIndex) => {
                                  const isTooHard = q.correctRate < 40;

                                  return (
                                    <div
                                      key={q.questionId}
                                      className={`p-3.5 rounded-lg border transition-all ${
                                        isTooHard
                                          ? 'border-danger/30 bg-danger/5'
                                          : 'border-border bg-surface-elevated/40'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 flex-1">
                                          <span className="text-12 font-mono font-bold text-text-muted shrink-0 mt-0.5">
                                            Q{qIndex + 1}.
                                          </span>
                                          <div>
                                            <p className="text-14 font-medium text-text">
                                              {q.text}
                                            </p>
                                            {isTooHard && (
                                              <div className="flex items-center gap-1.5 mt-2 text-12 text-danger font-medium">
                                                <AlertTriangle size={14} className="shrink-0" />
                                                <span>
                                                  Flagged: Too hard (&lt;40% pass rate). Consider reviewing question explanation.
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <span
                                            className={`inline-block px-2.5 py-1 rounded-md text-12 font-bold font-mono ${
                                              isTooHard
                                                ? 'bg-danger/10 text-danger border border-danger/30'
                                                : q.correctRate >= 70
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                            }`}
                                          >
                                            {q.correctRate}% Correct
                                          </span>
                                        </div>
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
                  )}
                </Card>
              </div>
            )}

            {/* TAB: AT-RISK LEARNERS */}
            {activeTab === 'at-risk' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
                    <div>
                      <h2 className="font-heading text-20 font-bold text-text flex items-center gap-2">
                        <span>At-Risk Learners</span>
                        {atRisk && atRisk.atRiskCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-12 font-bold bg-danger/10 text-danger border border-danger/20">
                            {atRisk.atRiskCount} needing attention
                          </span>
                        )}
                      </h2>
                      <p className="text-13 text-text-muted mt-1">
                        Learners flagged for inactivity (&gt;7d), multiple quiz failures (&ge;3), or lagging course progress.
                      </p>
                    </div>
                  </div>

                  {!atRisk || atRisk.learners.length === 0 ? (
                    <div className="py-16 text-center text-text-muted">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-16 font-semibold text-text">No Learners Are Currently At Risk</p>
                      <p className="text-13 mt-1 text-text-muted">
                        All enrolled learners have recent activity and are progressing through their courses smoothly!
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-12 font-medium uppercase tracking-wider text-text-muted">
                            <th className="pb-3 pr-4">Learner</th>
                            <th className="pb-3 px-4">Risk Reasons</th>
                            <th className="pb-3 px-4">Progress</th>
                            <th className="pb-3 px-4">Last Activity</th>
                            <th className="pb-3 pl-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {atRisk.learners.map((learner) => {
                            const isNudged = nudgedLearners.has(learner.userId);

                            return (
                              <tr key={learner.userId} className="hover:bg-surface-elevated/30 transition-colors">
                                <td className="py-4 pr-4">
                                  <div className="font-medium text-14 text-text">{learner.name}</div>
                                  <div className="text-12 text-text-muted font-mono">{learner.email}</div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {learner.reasons.map((reason, rIdx) => (
                                      <span
                                        key={rIdx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-11 font-medium bg-danger/10 text-danger border border-danger/20"
                                      >
                                        <AlertTriangle size={11} />
                                        <span>{reason}</span>
                                      </span>
                                    ))}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="w-28 space-y-1">
                                    <div className="text-12 font-mono text-text font-bold">
                                      {learner.progressPercent ?? 0}%
                                    </div>
                                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-primary h-full rounded-full"
                                        style={{ width: `${Math.min(100, Math.max(5, learner.progressPercent ?? 0))}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 text-13 text-text-muted whitespace-nowrap">
                                  {learner.lastActiveAt
                                    ? new Date(learner.lastActiveAt).toLocaleDateString()
                                    : 'Never active'}
                                </td>

                                <td className="py-4 pl-4 text-right">
                                  <Button
                                    size="sm"
                                    variant={isNudged ? 'secondary' : 'primary'}
                                    disabled={isNudged}
                                    onClick={() => handleNudge(learner.userId)}
                                    className="inline-flex items-center gap-1.5"
                                  >
                                    {isNudged ? (
                                      <>
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                        <span>Nudged &check;</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send size={13} />
                                        <span>Send Nudge</span>
                                      </>
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};
