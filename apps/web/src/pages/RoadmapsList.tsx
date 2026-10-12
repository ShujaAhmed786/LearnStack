import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { api } from '../lib/api';
import { Roadmap } from '@learnstack/shared';
import { Terminal, Cloud, BookOpen, ArrowRight, CheckCircle2, Clock, Layers } from 'lucide-react';

export function formatCourseTitle(title: string): string {
  if (!title) return 'Course';
  if (/\broadmap\b/i.test(title)) {
    return title.replace(/\broadmap\b/gi, 'Course');
  }
  return title.endsWith('Course') ? title : `${title} Course`;
}

export const RoadmapsList: React.FC = () => {
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        const data = await api.get<Roadmap[]>('/v1/roadmaps');
        setCourses(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  const getCourseIcon = (slug: string, iconName?: string | null) => {
    if (slug === 'devops' || iconName === 'Terminal') {
      return <Terminal className="w-7 h-7 text-primary" />;
    }
    if (slug === 'cloud' || iconName === 'Cloud') {
      return <Cloud className="w-7 h-7 text-primary" />;
    }
    return <BookOpen className="w-7 h-7 text-primary" />;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Courses' }]} />

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-28 font-bold text-text">Explore Courses</h1>
              <p className="text-14 text-text-muted">
                Step-by-step career tracks with curated video lessons, modular quizzes, and milestone verification.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-14">
            {error}
          </div>
        )}

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton height="280px" className="rounded-xl" />
            <Skeleton height="280px" className="rounded-xl" />
          </div>
        ) : courses.length === 0 ? (
          <Card className="text-center py-16 text-text-muted">
            <BookOpen size={40} className="mx-auto mb-3 text-primary opacity-60" />
            <h3 className="text-18 font-bold text-text">No courses available yet</h3>
            <p className="text-14 text-text-muted mt-1 max-w-sm mx-auto">
              Check back soon as new interactive curriculum courses are uploaded.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => {
              const percent = course.percentComplete ?? 0;
              const lessonCount = course.totalTopics ?? 0;
              const completedCount = course.completedTopics ?? 0;
              const moduleCount = course.stages?.length ?? 0;
              const estimatedHours = Math.max(2, Math.round(lessonCount * 0.5));
              const displayTitle = formatCourseTitle(course.title);

              return (
                <Card
                  key={course.id}
                  className="flex flex-col justify-between p-6 bg-surface border-border hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-13 h-13 p-3 rounded-xl bg-surface-hover border border-border flex items-center justify-center shadow-sm">
                        {getCourseIcon(course.slug, course.icon)}
                      </div>
                      <div className="flex items-center gap-2">
                        {course.isEnrolled ? (
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-12 font-bold text-primary">
                            Enrolled
                          </span>
                        ) : course.isFree || !course.priceCents ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-12 font-bold text-emerald-500">
                            Free
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-12 font-bold text-amber-500">
                            ${(course.priceCents / 100).toFixed(0)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-hover border border-border text-12 font-medium text-text-muted">
                          <Layers size={13} className="text-primary" />
                          <span>{moduleCount} Modules</span>
                        </span>
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-hover border border-border text-12 font-medium text-text-muted">
                          <Clock size={13} className="text-primary" />
                          <span>~{estimatedHours}h</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-20 font-bold text-text group-hover:text-primary transition-colors">
                        {displayTitle}
                      </h2>
                      <p className="text-14 text-text-muted mt-1.5 line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    {/* Modules preview pills */}
                    {course.stages && course.stages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {course.stages.slice(0, 4).map((stage) => (
                          <span
                            key={stage.id}
                            className="px-2.5 py-1 rounded-md text-11 font-medium bg-surface-hover text-text-muted border border-border/70"
                          >
                            {stage.title}
                          </span>
                        ))}
                        {course.stages.length > 4 && (
                          <span className="px-2.5 py-1 rounded-md text-11 font-medium bg-surface-hover text-text-muted/80 border border-border/50">
                            +{course.stages.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress & CTA */}
                  <div className="mt-6 pt-5 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-12">
                      <span className="text-text-muted flex items-center gap-1.5">
                        <CheckCircle2 size={14} className={completedCount > 0 ? 'text-primary' : 'text-text-muted'} />
                        {completedCount} of {lessonCount} lessons completed
                      </span>
                      <span className="font-bold text-text font-mono">{percent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <Link
                      to={`/courses/${course.slug}`}
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-[#0A1628] font-semibold text-14 transition-colors shadow-sm"
                    >
                      <span>
                        {course.isEnrolled
                          ? completedCount > 0
                            ? 'Continue Course'
                            : 'Start Learning'
                          : course.isFree || !course.priceCents
                          ? 'Start Free Course'
                          : `Enroll for $${(course.priceCents / 100).toFixed(0)}`}
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export const CoursesList = RoadmapsList;
