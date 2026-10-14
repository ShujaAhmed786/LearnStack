import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { Roadmap, RoadmapStage, RoadmapTopic, Quiz } from '@learnstack/shared';
import { useToast } from '../context/ToastContext';
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit2,
  PlayCircle,
  HelpCircle,
  X,
  Layers,
} from 'lucide-react';

export const AdminRoadmaps: React.FC = () => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Roadmap[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Modals state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSlug, setNewCourseSlug] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseIcon, setNewCourseIcon] = useState('Terminal');

  const [moduleModalTarget, setModuleModalTarget] = useState<string | null>(null); // courseId
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleOrder, setNewModuleOrder] = useState(0);

  const [lessonModalTarget, setLessonModalTarget] = useState<{
    stageId: string;
    topic?: RoadmapTopic;
  } | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState('');
  const [lessonQuizId, setLessonQuizId] = useState<string>('');
  const [lessonOrder, setLessonOrder] = useState(0);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const [rmData, quizData] = await Promise.all([
        api.get<Roadmap[]>('/v1/admin/roadmaps'),
        api.get<Quiz[]>('/v1/quizzes').catch(() => []),
      ]);
      setCourses(rmData);
      setQuizzes(quizData);
      if (rmData.length > 0 && !expandedCourseId) {
        setExpandedCourseId(rmData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post<Roadmap>('/v1/admin/roadmaps', {
        title: newCourseTitle,
        slug: newCourseSlug,
        description: newCourseDesc,
        icon: newCourseIcon,
      });
      setCourses((prev) => [...prev, created]);
      setShowCourseModal(false);
      setNewCourseTitle('');
      setNewCourseSlug('');
      setNewCourseDesc('');
    } catch (err: any) {
      showToast(err.message || 'Failed to create course', 'error');
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course and all its modules?')) return;
    try {
      await api.delete(`/v1/admin/roadmaps/${id}`);
      setCourses((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete course', 'error');
    }
  };

  // Create Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleModalTarget) return;
    try {
      const created = await api.post<RoadmapStage>(
        `/v1/admin/roadmaps/${moduleModalTarget}/stages`,
        {
          title: newModuleTitle,
          order: newModuleOrder,
        }
      );
      created.topics = [];
      setCourses((prev) =>
        prev.map((r) => {
          if (r.id === moduleModalTarget) {
            return { ...r, stages: [...(r.stages || []), created] };
          }
          return r;
        })
      );
      setModuleModalTarget(null);
      setNewModuleTitle('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add module', 'error');
    }
  };

  // Open Lesson Modal
  const openLessonModal = (stageId: string, topic?: RoadmapTopic) => {
    setLessonModalTarget({ stageId, topic });
    if (topic) {
      setLessonTitle(topic.title);
      setLessonDesc(topic.description || '');
      setLessonYoutubeUrl(topic.youtubeUrl || '');
      setLessonQuizId(topic.quizId || '');
      setLessonOrder(topic.order);
    } else {
      setLessonTitle('');
      setLessonDesc('');
      setLessonYoutubeUrl('');
      setLessonQuizId('');
      const targetStage = courses
        .flatMap((r) => r.stages || [])
        .find((s) => s.id === stageId);
      setLessonOrder(targetStage?.topics?.length || 0);
    }
  };

  // Save Lesson (Create or Update)
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonModalTarget) return;

    try {
      if (lessonModalTarget.topic) {
        // Update existing lesson
        const updated = await api.patch<RoadmapTopic>(
          `/v1/admin/topics/${lessonModalTarget.topic.id}`,
          {
            title: lessonTitle,
            description: lessonDesc,
            youtubeUrl: lessonYoutubeUrl,
            quizId: lessonQuizId || null,
            order: lessonOrder,
          }
        );
        setCourses((prev) =>
          prev.map((r) => ({
            ...r,
            stages: r.stages?.map((s) => {
              if (s.id === lessonModalTarget.stageId) {
                return {
                  ...s,
                  topics: s.topics.map((t) => (t.id === updated.id ? updated : t)),
                };
              }
              return s;
            }),
          }))
        );
      } else {
        // Create new lesson
        const created = await api.post<RoadmapTopic>(
          `/v1/admin/stages/${lessonModalTarget.stageId}/topics`,
          {
            title: lessonTitle,
            description: lessonDesc,
            youtubeUrl: lessonYoutubeUrl,
            quizId: lessonQuizId || null,
            order: lessonOrder,
          }
        );
        setCourses((prev) =>
          prev.map((r) => ({
            ...r,
            stages: r.stages?.map((s) => {
              if (s.id === lessonModalTarget.stageId) {
                return {
                  ...s,
                  topics: [...s.topics, created],
                };
              }
              return s;
            }),
          }))
        );
      }
      setLessonModalTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save lesson', 'error');
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await api.delete(`/v1/admin/topics/${topicId}`);
      setCourses((prev) =>
        prev.map((r) => ({
          ...r,
          stages: r.stages?.map((s) => ({
            ...s,
            topics: s.topics.filter((t) => t.id !== topicId),
          })),
        }))
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to delete lesson', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={22} className="text-primary" />
              <h1 className="text-24 font-bold text-text">Course Management</h1>
            </div>
            <p className="text-14 text-text-muted mt-1">
              Create and edit learning courses, arrange modules, attach video tutorial links, and connect quizzes.
            </p>
          </div>

          <Button onClick={() => setShowCourseModal(true)} className="flex items-center gap-2">
            <Plus size={16} /> Add Course
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-14">
            {error}
          </div>
        )}

        {/* Course List */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton height="100px" className="rounded-xl" />
            <Skeleton height="100px" className="rounded-xl" />
          </div>
        ) : courses.length === 0 ? (
          <Card className="text-center py-16 text-text-muted">
            <BookOpen size={36} className="mx-auto mb-2 text-primary opacity-60" />
            <p className="text-16 font-semibold text-text">No courses created yet.</p>
            <p className="text-14 text-text-muted mt-1">Click "Add Course" above to create your first curriculum track.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => {
              const isExpanded = expandedCourseId === course.id;
              const totalLessonsCount =
                course.stages?.reduce((acc, s) => acc + (s.topics?.length || 0), 0) || 0;

              return (
                <Card key={course.id} className="bg-surface border-border overflow-hidden shadow-sm">
                  {/* Course Accordion Header */}
                  <div
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface-hover/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-text-muted">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-17 font-bold text-text">{course.title}</h2>
                          <span className="text-11 px-2 py-0.5 rounded bg-surface-hover font-mono text-text-muted border border-border">
                            slug: {course.slug}
                          </span>
                          {(!course.priceCents || course.priceCents === 0) ? (
                            <span className="text-11 px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Free
                            </span>
                          ) : (
                            <span className="text-11 px-2 py-0.5 rounded font-bold bg-primary/10 text-primary border border-primary/20">
                              ${course.priceCents / 100}
                            </span>
                          )}
                        </div>
                        <p className="text-13 text-text-muted mt-0.5">{course.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-12 text-text-muted font-medium">
                        {course.stages?.length || 0} Modules · {totalLessonsCount} Lessons
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-surface-hover transition-colors"
                        title="Delete course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Modules Body */}
                  {isExpanded && (
                    <div className="p-5 border-t border-border bg-surface-hover/20 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-14 font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={15} className="text-primary" />
                          <span>Modules & Lessons</span>
                        </h3>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setModuleModalTarget(course.id);
                            setNewModuleOrder((course.stages?.length || 0));
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <Plus size={14} /> Add Module
                        </Button>
                      </div>

                      {course.stages?.map((module) => (
                        <div
                          key={module.id}
                          className="p-4 rounded-xl bg-surface border border-border space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2 font-semibold text-15 text-text">
                              <span className="text-12 font-mono text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                                #{module.order}
                              </span>
                              <span>{module.title}</span>
                              <span className="text-12 text-text-muted font-normal">
                                ({module.topics?.length || 0} lessons)
                              </span>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openLessonModal(module.id)}
                              className="text-12 text-primary hover:text-primary-hover flex items-center gap-1"
                            >
                              <Plus size={13} /> Add Lesson
                            </Button>
                          </div>

                          {/* Lessons List */}
                          <div className="space-y-2">
                            {module.topics?.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-surface-hover/40 border border-border/70 hover:border-border transition-colors text-13"
                              >
                                <div className="space-y-0.5 max-w-xl">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-text">{lesson.title}</span>
                                    {lesson.youtubeUrl && (
                                      <a
                                        href={lesson.youtubeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-text-muted hover:text-primary flex items-center gap-1 text-11"
                                      >
                                        <PlayCircle size={13} /> Video
                                      </a>
                                    )}
                                    {lesson.quizId && (
                                      <span className="text-emerald-500 flex items-center gap-1 text-11 font-mono font-medium">
                                        <HelpCircle size={13} /> Quiz Linked
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-12 text-text-muted line-clamp-1">
                                    {lesson.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openLessonModal(module.id, lesson)}
                                    className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover"
                                    title="Edit Lesson"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    className="p-1 rounded text-text-muted hover:text-danger hover:bg-surface-hover"
                                    title="Delete Lesson"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Create Course */}
        {showCourseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 bg-surface border-border space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-18 font-bold text-text">Create Course</h3>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-text-muted hover:text-text"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <Input
                  label="Title"
                  value={newCourseTitle}
                  onChange={(e) => {
                    setNewCourseTitle(e.target.value);
                    if (!newCourseSlug) {
                      setNewCourseSlug(
                        e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
                      );
                    }
                  }}
                  placeholder="e.g. Full-Stack Engineer"
                  required
                />
                <Input
                  label="Slug"
                  value={newCourseSlug}
                  onChange={(e) => setNewCourseSlug(e.target.value)}
                  placeholder="e.g. fullstack"
                  required
                />
                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">Description</label>
                  <textarea
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg bg-surface border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Short description of this curriculum track..."
                  />
                </div>
                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">Icon</label>
                  <select
                    value={newCourseIcon}
                    onChange={(e) => setNewCourseIcon(e.target.value)}
                    className="w-full rounded-lg bg-surface border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="Terminal">Terminal</option>
                    <option value="Cloud">Cloud</option>
                    <option value="BookOpen">Book</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setShowCourseModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Course</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Create Module */}
        {moduleModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 bg-surface border-border space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-18 font-bold text-text">Add Module</h3>
                <button
                  onClick={() => setModuleModalTarget(null)}
                  className="text-text-muted hover:text-text"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateModule} className="space-y-4">
                <Input
                  label="Module Title"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Container Fundamentals"
                  required
                />
                <Input
                  label="Order Index"
                  type="number"
                  value={newModuleOrder}
                  onChange={(e) => setNewModuleOrder(parseInt(e.target.value) || 0)}
                  required
                />
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setModuleModalTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Module</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Create / Edit Lesson */}
        {lessonModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm">
            <Card className="w-full max-w-lg p-6 bg-surface border-border space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-18 font-bold text-text">
                  {lessonModalTarget.topic ? 'Edit Lesson' : 'Add Lesson'}
                </h3>
                <button
                  onClick={() => setLessonModalTarget(null)}
                  className="text-text-muted hover:text-text"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-4">
                <Input
                  label="Lesson Title"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Linux Permissions & Shell Basics"
                  required
                />

                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">Description</label>
                  <textarea
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-surface border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="1-2 sentences explaining what to learn..."
                  />
                </div>

                <Input
                  label="YouTube Tutorial URL"
                  value={lessonYoutubeUrl}
                  onChange={(e) => setLessonYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />

                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">
                    Link Quiz (Optional)
                  </label>
                  <select
                    value={lessonQuizId}
                    onChange={(e) => setLessonQuizId(e.target.value)}
                    className="w-full rounded-lg bg-surface border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">None (No quiz linked)</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.questions?.length || 0} questions)
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Order Index"
                  type="number"
                  value={lessonOrder}
                  onChange={(e) => setLessonOrder(parseInt(e.target.value) || 0)}
                  required
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setLessonModalTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {lessonModalTarget.topic ? 'Save Changes' : 'Add Lesson'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const AdminCourses = AdminRoadmaps;
