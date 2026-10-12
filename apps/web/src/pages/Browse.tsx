import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';
import { apiFetch } from '../lib/api';
import { Category, Collection, Subject, Topic } from '@learnstack/shared';
import { Folder, FolderOpen, Book, FileText, ChevronRight } from 'lucide-react';

export const Browse: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeCategoryId = searchParams.get('category');
  const activeCollectionId = searchParams.get('collection');
  const activeSubjectId = searchParams.get('subject');

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load root categories
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Category[]>('/v1/categories');
        setCategories(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Load collections when category changes
  useEffect(() => {
    if (!activeCategoryId) {
      setCollections([]);
      return;
    }
    async function loadCollections() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Collection[]>(`/v1/categories/${activeCategoryId}/collections`);
        setCollections(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load collections');
      } finally {
        setLoading(false);
      }
    }
    loadCollections();
  }, [activeCategoryId]);

  // Load subjects when collection changes
  useEffect(() => {
    if (!activeCollectionId) {
      setSubjects([]);
      return;
    }
    async function loadSubjects() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Subject[]>(`/v1/collections/${activeCollectionId}/subjects`);
        setSubjects(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load subjects');
      } finally {
        setLoading(false);
      }
    }
    loadSubjects();
  }, [activeCollectionId]);

  // Load topics when subject changes
  useEffect(() => {
    if (!activeSubjectId) {
      setTopics([]);
      return;
    }
    async function loadTopics() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<Topic[]>(`/v1/subjects/${activeSubjectId}/topics`);
        setTopics(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, [activeSubjectId]);

  // Calculate current breadcrumb path
  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  const breadcrumbs: BreadcrumbItem[] = [];
  if (activeCategory) {
    breadcrumbs.push({
      label: activeCategory.name,
      to: `/browse?category=${activeCategory.id}`,
    });
  }
  if (activeCollection) {
    breadcrumbs.push({
      label: activeCollection.name,
      to: `/browse?category=${activeCategoryId}&collection=${activeCollection.id}`,
    });
  }
  if (activeSubject) {
    breadcrumbs.push({
      label: activeSubject.name,
      to: `/browse?category=${activeCategoryId}&collection=${activeCollectionId}&subject=${activeSubject.id}`,
    });
  }

  // Current view level
  let currentLevel: 'categories' | 'collections' | 'subjects' | 'topics' = 'categories';
  if (activeSubjectId) currentLevel = 'topics';
  else if (activeCollectionId) currentLevel = 'subjects';
  else if (activeCategoryId) currentLevel = 'collections';

  return (
    <Layout
      title={
        currentLevel === 'categories'
          ? 'Browse Catalog'
          : currentLevel === 'collections'
          ? activeCategory?.name || 'Collections'
          : currentLevel === 'subjects'
          ? activeCollection?.name || 'Subjects'
          : activeSubject?.name || 'Topics'
      }
      description={
        currentLevel === 'categories'
          ? 'Explore all categories and learning tracks'
          : currentLevel === 'collections'
          ? activeCategory?.description || 'Select a collection to view subjects'
          : currentLevel === 'subjects'
          ? activeCollection?.description || 'Select a subject to view topics'
          : activeSubject?.description || 'Select a topic to start learning'
      }
    >
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton height="24px" className="w-3/4" />
              <Skeleton height="16px" className="w-full" />
              <Skeleton height="16px" className="w-1/2" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Level 1: Categories */}
          {currentLevel === 'categories' && (
            <div>
              {categories.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border p-8">
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
                    <Folder size={24} />
                  </div>
                  <h3 className="text-16 font-semibold text-text mb-1">No categories yet</h3>
                  <p className="text-14 text-text-muted">
                    No learning categories have been published for this organization yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => setSearchParams({ category: cat.id })}
                      className="cursor-pointer group"
                    >
                      <Card className="h-full flex flex-col justify-between hover:border-primary/50 hover:bg-surface-hover transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                              <Folder size={20} />
                            </div>
                            <span className="text-12 font-mono text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                              {cat._count?.collections ?? 0} collections
                            </span>
                          </div>
                          <h3 className="text-16 font-semibold text-text group-hover:text-primary transition-colors">
                            {cat.name}
                          </h3>
                          {cat.description && (
                            <p className="text-14 text-text-muted mt-2 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-12 text-primary font-medium">
                          <span>Explore collections</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Level 2: Collections */}
          {currentLevel === 'collections' && (
            <div>
              {collections.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border p-8">
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
                    <FolderOpen size={24} />
                  </div>
                  <h3 className="text-16 font-semibold text-text mb-1">No collections in this category</h3>
                  <p className="text-14 text-text-muted">
                    Check back later or choose another category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      onClick={() =>
                        setSearchParams({
                          category: activeCategoryId!,
                          collection: col.id,
                        })
                      }
                      className="cursor-pointer group"
                    >
                      <Card className="h-full flex flex-col justify-between hover:border-primary/50 hover:bg-surface-hover transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                              <FolderOpen size={20} />
                            </div>
                            <span className="text-12 font-mono text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                              {col._count?.subjects ?? 0} subjects
                            </span>
                          </div>
                          <h3 className="text-16 font-semibold text-text group-hover:text-primary transition-colors">
                            {col.name}
                          </h3>
                          {col.description && (
                            <p className="text-14 text-text-muted mt-2 line-clamp-2">
                              {col.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-12 text-primary font-medium">
                          <span>View subjects</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Level 3: Subjects */}
          {currentLevel === 'subjects' && (
            <div>
              {subjects.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border p-8">
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
                    <Book size={24} />
                  </div>
                  <h3 className="text-16 font-semibold text-text mb-1">No subjects in this collection</h3>
                  <p className="text-14 text-text-muted">
                    Check back later or choose another collection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() =>
                        setSearchParams({
                          category: activeCategoryId!,
                          collection: activeCollectionId!,
                          subject: sub.id,
                        })
                      }
                      className="cursor-pointer group"
                    >
                      <Card className="h-full flex flex-col justify-between hover:border-primary/50 hover:bg-surface-hover transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                              <Book size={20} />
                            </div>
                            <span className="text-12 font-mono text-text-muted px-2 py-0.5 rounded bg-surface-hover">
                              {sub._count?.topics ?? 0} lessons
                            </span>
                          </div>
                          <h3 className="text-16 font-semibold text-text group-hover:text-primary transition-colors">
                            {sub.name}
                          </h3>
                          {sub.description && (
                            <p className="text-14 text-text-muted mt-2 line-clamp-2">
                              {sub.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-12 text-primary font-medium">
                          <span>View lessons</span>
                          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Level 4: Lessons */}
          {currentLevel === 'topics' && (
            <div>
              {topics.length === 0 ? (
                <div className="text-center py-16 bg-surface rounded-xl border border-border p-8">
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-16 font-semibold text-text mb-1">No lessons in this subject</h3>
                  <p className="text-14 text-text-muted">
                    No lessons have been added to this subject yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((t, idx) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/topics/${t.id}`)}
                      className="cursor-pointer group"
                    >
                      <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/50 hover:bg-surface-hover transition-all flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-text-muted font-mono text-14 shrink-0 group-hover:text-primary group-hover:border-primary/30">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-16 font-semibold text-text truncate group-hover:text-primary transition-colors">
                              {t.title}
                            </h4>
                            <p className="text-12 text-text-muted truncate mt-0.5">
                              {t.content.replace(/^[#*`\- >]+/gm, '').slice(0, 100)}...
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {t.youtubeUrl && (
                            <span className="text-12 px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                              Video
                            </span>
                          )}
                          <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};
