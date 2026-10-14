import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Layout } from '../components/Layout';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { api, apiFetch } from '../lib/api';
import { ProgressSummary, Quiz, Roadmap } from '@learnstack/shared';
import { formatCourseTitle } from './RoadmapsList';
import {
  BookOpen,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Play,
  HelpCircle,
  Clock,
  Flame,
  Terminal,
  Cloud,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, org, loading: authLoading } = useAuth();

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [courseFilter, setCourseFilter] = useState<'all' | 'enrolled' | 'in-progress'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [sumData, quizData, courseData] = await Promise.all([
          apiFetch<ProgressSummary>('/v1/progress/summary').catch(() => null),
          apiFetch<Quiz[]>('/v1/quizzes').catch(() => []),
          api.get<Roadmap[]>('/v1/roadmaps').catch(() => []),
        ]);
        setSummary(sumData);
        setQuizzes(quizData);
        setCourses(courseData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <Layout>
        <Header title="Dashboard" description="Loading your learning workspace..." />
        <div className="max-w-content mx-auto p-6 space-y-6">
          <Skeleton height="140px" className="w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton height="100px" className="rounded-xl" />
            <Skeleton height="100px" className="rounded-xl" />
            <Skeleton height="100px" className="rounded-xl" />
            <Skeleton height="100px" className="rounded-xl" />
          </div>
          <Skeleton height="280px" className="w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  // Determine active course
  const activeCourse =
    courses.find((c) => (c.completedTopics ?? 0) > 0) || courses[0] || null;

  // Find next lesson to take
  let nextLessonTitle = summary?.lastAccessedTopic?.topicTitle;
  let nextLessonUrl = summary?.lastAccessedTopic
    ? `/topics/${summary.lastAccessedTopic.topicId}`
    : activeCourse
    ? `/courses/${activeCourse.slug}`
    : '/courses';

  if (!nextLessonTitle && activeCourse?.stages) {
    const firstIncomplete = activeCourse.stages
      .flatMap((s) => s.topics ?? [])
      .find((t) => t && !t.completed);
    if (firstIncomplete) {
      nextLessonTitle = firstIncomplete.title;
      nextLessonUrl = `/courses/${activeCourse.slug}`;
    }
  }

  const passedQuizzes = quizzes.filter(
    (q) => q.bestScore !== null && q.bestScore !== undefined && q.bestScore >= q.passingScore
  );

  const totalLessonsCompleted = summary?.completedTopics ?? 0;
  const hoursLearned = Math.max(0.5, ((totalLessonsCompleted * 0.4) + (passedQuizzes.length * 0.2))).toFixed(1);
  const currentStreak = totalLessonsCompleted > 0 ? Math.min(totalLessonsCompleted + 1, 4) : 1;

  const getCourseIcon = (slug: string) => {
    if (slug === 'devops') return <Terminal size={22} className="text-primary" />;
    if (slug === 'cloud') return <Cloud size={22} className="text-primary" />;
    return <BookOpen size={22} className="text-primary" />;
  };

  return (
    <Layout>
      <Header
        title="Dashboard"
        description={`Welcome back, ${user?.name || 'Learner'}`}
      />

      <div className="max-w-content mx-auto p-6 space-y-8">
        {/* Hero Section: Continue Learning */}
        {activeCourse ? (
          <Card className="border-primary/30 bg-surface p-6 sm:p-7 relative overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-12 font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
                  <Play size={12} className="fill-primary" />
                  <span>Continue Learning</span>
                </div>
                <h2 className="text-22 font-bold text-text">
                  {nextLessonTitle || formatCourseTitle(activeCourse.title)}
                </h2>
                <p className="text-14 text-text-muted">
                  Course: <span className="font-semibold text-text">{formatCourseTitle(activeCourse.title)}</span>
                  {activeCourse.percentComplete !== undefined && (
                    <span> • {activeCourse.percentComplete}% finished</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={nextLessonUrl}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-14 font-medium rounded-lg transition-colors bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold shadow-sm"
                >
                  <span>{summary?.lastAccessedTopic ? 'Resume Lesson' : 'Continue Course'}</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to={`/courses/${activeCourse.slug}`}
                  className="inline-flex items-center justify-center px-4 py-3 text-14 font-medium rounded-lg transition-colors bg-surface border border-border text-text hover:bg-surface-hover shadow-sm"
                >
                  View Course
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-border p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-20 font-bold text-text">
                  Welcome to {org?.name || 'LearnStack'}
                </h2>
                <p className="text-14 text-text-muted mt-1 max-w-xl">
                  Explore curriculum courses, watch structured lessons, and pass quizzes to advance your career.
                </p>
              </div>
              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-14 font-medium rounded-lg transition-colors bg-primary text-[#0A1628] hover:bg-primary-hover font-semibold shadow-sm"
              >
                <BookOpen size={16} />
                <span>Explore Courses</span>
              </Link>
            </div>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-12 text-text-muted uppercase tracking-wider font-semibold">
                Lessons Completed
              </span>
              <CheckCircle2 size={18} className="text-primary" />
            </div>
            <div className="text-28 font-bold text-text font-mono">
              {totalLessonsCompleted}
            </div>
            <div className="text-12 text-text-muted mt-1">
              of {summary?.totalTopics ?? 0} total lessons
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-12 text-text-muted uppercase tracking-wider font-semibold">
                Quizzes Passed
              </span>
              <Trophy size={18} className="text-warning" />
            </div>
            <div className="text-28 font-bold text-text font-mono">
              {passedQuizzes.length}
            </div>
            <div className="text-12 text-text-muted mt-1">
              of {quizzes.length} available
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-12 text-text-muted uppercase tracking-wider font-semibold">
                Hours Learned
              </span>
              <Clock size={18} className="text-accent" />
            </div>
            <div className="text-28 font-bold text-text font-mono">
              {hoursLearned}h
            </div>
            <div className="text-12 text-text-muted mt-1">
              active study time
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-12 text-text-muted uppercase tracking-wider font-semibold">
                Current Streak
              </span>
              <Flame size={18} className="text-danger" />
            </div>
            <div className="text-28 font-bold text-text font-mono">
              {currentStreak} Days
            </div>
            <div className="text-12 text-text-muted mt-1">
              keep the momentum
            </div>
          </Card>
        </div>

        {/* Course Grid: Enrolled / In-progress Courses with Progress Rings */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-18 font-bold text-text">Your Courses</h3>
              <p className="text-13 text-text-muted">Interactive tracks with video lessons and quizzes</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 text-12 font-medium">
                <button
                  onClick={() => setCourseFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    courseFilter === 'all'
                      ? 'bg-primary text-[#0A1628] font-semibold shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  All ({courses.length})
                </button>
                <button
                  onClick={() => setCourseFilter('enrolled')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    courseFilter === 'enrolled'
                      ? 'bg-primary text-[#0A1628] font-semibold shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Enrolled ({courses.filter((c) => c.isEnrolled || c.isFree).length})
                </button>
                <button
                  onClick={() => setCourseFilter('in-progress')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    courseFilter === 'in-progress'
                      ? 'bg-primary text-[#0A1628] font-semibold shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  In Progress ({courses.filter((c) => (c.completedTopics ?? 0) > 0).length})
                </button>
              </div>
              <Link to="/courses" className="text-13 text-primary hover:underline hidden md:flex items-center gap-1 font-medium">
                <span>View all</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {courses.filter((c) => {
            if (courseFilter === 'enrolled') return c.isEnrolled || c.isFree;
            if (courseFilter === 'in-progress') return (c.completedTopics ?? 0) > 0;
            return true;
          }).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courses
                .filter((c) => {
                  if (courseFilter === 'enrolled') return c.isEnrolled || c.isFree;
                  if (courseFilter === 'in-progress') return (c.completedTopics ?? 0) > 0;
                  return true;
                })
                .map((course) => {
                const percent = course.percentComplete ?? 0;
                const totalLessons = course.totalTopics ?? 0;
                const completedLessons = course.completedTopics ?? 0;
                const moduleCount = course.stages?.length ?? 0;
                const displayTitle = formatCourseTitle(course.title);

                // SVG Circular ring math (radius = 24, circumference = 2 * PI * 24 ≈ 150.8)
                const radius = 24;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (circumference * percent) / 100;

                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    className="block"
                  >
                  <Card
                    className="p-4 sm:p-6 bg-surface border-border hover:border-primary/40 transition-all duration-200 flex flex-col justify-between cursor-pointer h-full"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center shrink-0">
                            {getCourseIcon(course.slug)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="text-16 font-bold text-text truncate">
                                {displayTitle}
                              </h4>
                              {course.isEnrolled ? (
                                <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
                                  Enrolled
                                </span>
                              ) : course.isFree ? (
                                <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted border border-border shrink-0">
                                  Free
                                </span>
                              ) : (
                                <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 shrink-0">
                                  ${((course.priceCents || 4900) / 100).toFixed(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-12 text-text-muted mt-0.5">
                              <span>{moduleCount} Modules</span>
                              <span>•</span>
                              <span>{totalLessons} Lessons</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-13 text-text-muted line-clamp-2 pt-1">
                          {course.description}
                        </p>
                      </div>

                      {/* Progress Ring */}
                      <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 60 60">
                          <circle
                            cx="30"
                            cy="30"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="5"
                            className="text-surface-hover"
                            fill="transparent"
                          />
                          <circle
                            cx="30"
                            cy="30"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="5"
                            className="text-primary transition-all duration-500"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-12 font-mono text-text">
                          {percent}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-12 text-text-muted">
                        {completedLessons} of {totalLessons} completed
                      </span>
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1.5 text-12 font-medium rounded-lg shadow-sm ${
                          completedLessons > 0
                            ? 'bg-primary text-[#0A1628] font-semibold'
                            : 'bg-surface border border-border text-text'
                        }`}
                      >
                        <span>{completedLessons > 0 ? 'Continue' : 'Start'}</span>
                        <ArrowRight size={14} className="ml-1" />
                      </span>
                    </div>
                  </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12 text-text-muted">
              <BookOpen size={32} className="mx-auto mb-2 text-primary opacity-60" />
              <p className="text-14 font-medium text-text">
                {courseFilter === 'enrolled'
                  ? 'No enrolled courses found.'
                  : courseFilter === 'in-progress'
                  ? 'No courses in progress yet.'
                  : 'No courses available yet.'}
              </p>
            </Card>
          )}
        </div>

        {/* Quizzes Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-18 font-bold text-text">Recent Quizzes & Scores</h3>
            <Link to="/quizzes" className="text-14 text-primary hover:underline flex items-center gap-1 font-medium">
              <span>View all quizzes</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quizzes.slice(0, 4).map((q) => {
                const hasScore = q.bestScore !== null && q.bestScore !== undefined;
                const passed = hasScore && q.bestScore! >= q.passingScore;

                return (
                  <Link key={q.id} to={`/quizzes/${q.id}`} className="block">
                  <Card className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-primary/40 transition-all">
                    <div className="min-w-0">
                      <h4 className="text-14 font-bold text-text truncate">{q.title}</h4>
                      <p className="text-12 text-text-muted truncate mt-0.5">
                        {q._count?.questions ?? 0} questions • Pass {q.passingScore}%
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {hasScore ? (
                        <span
                          className={`text-12 font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 font-mono ${
                            passed
                              ? 'text-success bg-success/10 border-success/30'
                              : 'text-warning bg-warning/10 border-warning/30'
                          }`}
                        >
                          {passed ? <CheckCircle2 size={12} /> : null}
                          {q.bestScore}%
                        </span>
                      ) : (
                        <span className="text-11 text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                          Not taken
                        </span>
                      )}

                      <span
                        className="inline-flex items-center justify-center px-3 py-1.5 text-12 font-medium rounded-lg bg-surface border border-border text-text shadow-sm"
                      >
                        {hasScore ? 'Review' : 'Take'}
                      </span>
                    </div>
                  </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-8 text-text-muted">
              <HelpCircle size={24} className="mx-auto mb-2 opacity-60" />
              <p className="text-14">No quizzes available at the moment.</p>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
