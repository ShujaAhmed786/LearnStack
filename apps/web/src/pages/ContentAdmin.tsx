import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Skeleton } from '../components/Skeleton';
import { FileUpload } from '../components/FileUpload';
import { apiFetch } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Category, Collection, Subject, Topic } from '@learnstack/shared';
import { useToast } from '../context/ToastContext';
import {
  Folder,
  FolderOpen,
  Book,
  FileText,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';

interface ExtendedCollection extends Collection {
  subjects?: Subject[];
}

interface ExtendedCategory extends Category {
  collections?: ExtendedCollection[];
}

export const ContentAdmin: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded nodes state
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  // Loaded child caches
  const [collectionsCache, setCollectionsCache] = useState<Record<string, Collection[]>>({});
  const [subjectsCache, setSubjectsCache] = useState<Record<string, Subject[]>>({});
  const [topicsCache, setTopicsCache] = useState<Record<string, Topic[]>>({});

  // Modal / Form state
  type ModalType =
    | { type: 'createCategory' }
    | { type: 'editCategory'; category: Category }
    | { type: 'createCollection'; categoryId: string }
    | { type: 'editCollection'; collection: Collection }
    | { type: 'createSubject'; collectionId: string }
    | { type: 'editSubject'; subject: Subject }
    | { type: 'createTopic'; subjectId: string }
    | { type: 'editTopic'; topic: Topic };

  const [modal, setModal] = useState<ModalType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    title: '',
    content: '',
    order: 0,
    youtubeUrl: '',
    videoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Category[]>('/v1/categories');
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const toggleCategory = async (catId: string) => {
    const nextState = !expandedCats[catId];
    setExpandedCats((prev) => ({ ...prev, [catId]: nextState }));
    if (nextState && !collectionsCache[catId]) {
      try {
        const cols = await apiFetch<Collection[]>(`/v1/categories/${catId}/collections`);
        setCollectionsCache((prev) => ({ ...prev, [catId]: cols }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load collections');
      }
    }
  };

  const toggleCollection = async (colId: string) => {
    const nextState = !expandedCols[colId];
    setExpandedCols((prev) => ({ ...prev, [colId]: nextState }));
    if (nextState && !subjectsCache[colId]) {
      try {
        const subs = await apiFetch<Subject[]>(`/v1/collections/${colId}/subjects`);
        setSubjectsCache((prev) => ({ ...prev, [colId]: subs }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load subjects');
      }
    }
  };

  const toggleSubject = async (subId: string) => {
    const nextState = !expandedSubs[subId];
    setExpandedSubs((prev) => ({ ...prev, [subId]: nextState }));
    if (nextState && !topicsCache[subId]) {
      try {
        const topics = await apiFetch<Topic[]>(`/v1/subjects/${subId}/topics`);
        setTopicsCache((prev) => ({ ...prev, [subId]: topics }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      }
    }
  };

  const defaultFormData = {
    name: '',
    description: '',
    title: '',
    content: '',
    order: 0,
    youtubeUrl: '',
    videoUrl: '',
  };

  // Open Modals
  const openCreateCategory = () => {
    setFormData(defaultFormData);
    setFormError(null);
    setModal({ type: 'createCategory' });
  };

  const openEditCategory = (category: Category) => {
    setFormData({
      ...defaultFormData,
      name: category.name,
      description: category.description || '',
    });
    setFormError(null);
    setModal({ type: 'editCategory', category });
  };

  const openCreateCollection = (categoryId: string) => {
    setFormData(defaultFormData);
    setFormError(null);
    setModal({ type: 'createCollection', categoryId });
  };

  const openEditCollection = (collection: Collection) => {
    setFormData({
      ...defaultFormData,
      name: collection.name,
      description: collection.description || '',
    });
    setFormError(null);
    setModal({ type: 'editCollection', collection });
  };

  const openCreateSubject = (collectionId: string) => {
    setFormData(defaultFormData);
    setFormError(null);
    setModal({ type: 'createSubject', collectionId });
  };

  const openEditSubject = (subject: Subject) => {
    setFormData({
      ...defaultFormData,
      name: subject.name,
      description: subject.description || '',
    });
    setFormError(null);
    setModal({ type: 'editSubject', subject });
  };

  const openCreateTopic = (subjectId: string) => {
    setFormData({ name: '', description: '', title: '', content: '', order: 0, youtubeUrl: '', videoUrl: '' });
    setFormError(null);
    setModal({ type: 'createTopic', subjectId });
  };

  const openEditTopic = (topic: Topic) => {
    setFormData({
      name: '',
      description: '',
      title: topic.title,
      content: topic.content,
      order: topic.order,
      youtubeUrl: topic.youtubeUrl || '',
      videoUrl: topic.videoUrl || '',
    });
    setFormError(null);
    setModal({ type: 'editTopic', topic });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (modal.type === 'createCategory') {
        await apiFetch('/v1/categories', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        await loadCategories();
      } else if (modal.type === 'editCategory') {
        await apiFetch(`/v1/categories/${modal.category.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        await loadCategories();
      } else if (modal.type === 'createCollection') {
        await apiFetch(`/v1/categories/${modal.categoryId}/collections`, {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        const cols = await apiFetch<Collection[]>(`/v1/categories/${modal.categoryId}/collections`);
        setCollectionsCache((prev) => ({ ...prev, [modal.categoryId]: cols }));
      } else if (modal.type === 'editCollection') {
        await apiFetch(`/v1/collections/${modal.collection.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        const cols = await apiFetch<Collection[]>(`/v1/categories/${modal.collection.categoryId}/collections`);
        setCollectionsCache((prev) => ({ ...prev, [modal.collection.categoryId]: cols }));
      } else if (modal.type === 'createSubject') {
        await apiFetch(`/v1/collections/${modal.collectionId}/subjects`, {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        const subs = await apiFetch<Subject[]>(`/v1/collections/${modal.collectionId}/subjects`);
        setSubjectsCache((prev) => ({ ...prev, [modal.collectionId]: subs }));
      } else if (modal.type === 'editSubject') {
        await apiFetch(`/v1/subjects/${modal.subject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: formData.name, description: formData.description || undefined }),
        });
        const subs = await apiFetch<Subject[]>(`/v1/collections/${modal.subject.collectionId}/subjects`);
        setSubjectsCache((prev) => ({ ...prev, [modal.subject.collectionId]: subs }));
      } else if (modal.type === 'createTopic') {
        await apiFetch(`/v1/subjects/${modal.subjectId}/topics`, {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            order: Number(formData.order),
            youtubeUrl: formData.youtubeUrl || undefined,
            videoUrl: formData.videoUrl || undefined,
          }),
        });
        const topics = await apiFetch<Topic[]>(`/v1/subjects/${modal.subjectId}/topics`);
        setTopicsCache((prev) => ({ ...prev, [modal.subjectId]: topics }));
      } else if (modal.type === 'editTopic') {
        await apiFetch(`/v1/topics/${modal.topic.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            order: Number(formData.order),
            youtubeUrl: formData.youtubeUrl || null,
            videoUrl: formData.videoUrl || null,
          }),
        });
        const topics = await apiFetch<Topic[]>(`/v1/subjects/${modal.topic.subjectId}/topics`);
        setTopicsCache((prev) => ({ ...prev, [modal.topic.subjectId]: topics }));
      }

      setModal(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handlers
  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}" and all its contents?`)) return;
    try {
      await apiFetch(`/v1/categories/${cat.id}`, { method: 'DELETE' });
      await loadCategories();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleDeleteCollection = async (col: Collection) => {
    if (!confirm(`Are you sure you want to delete collection "${col.name}"?`)) return;
    try {
      await apiFetch(`/v1/collections/${col.id}`, { method: 'DELETE' });
      const cols = await apiFetch<Collection[]>(`/v1/categories/${col.categoryId}/collections`);
      setCollectionsCache((prev) => ({ ...prev, [col.categoryId]: cols }));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleDeleteSubject = async (sub: Subject) => {
    if (!confirm(`Are you sure you want to delete subject "${sub.name}"?`)) return;
    try {
      await apiFetch(`/v1/subjects/${sub.id}`, { method: 'DELETE' });
      const subs = await apiFetch<Subject[]>(`/v1/collections/${sub.collectionId}/subjects`);
      setSubjectsCache((prev) => ({ ...prev, [sub.collectionId]: subs }));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    if (!confirm(`Are you sure you want to delete topic "${topic.title}"?`)) return;
    try {
      await apiFetch(`/v1/topics/${topic.id}`, { method: 'DELETE' });
      const topics = await apiFetch<Topic[]>(`/v1/subjects/${topic.subjectId}/topics`);
      setTopicsCache((prev) => ({ ...prev, [topic.subjectId]: topics }));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <Layout
      title="Content Management"
      description="Manage educational hierarchies: Categories, Collections, Subjects, and Topics"
      actions={
        <Button onClick={openCreateCategory} className="flex items-center gap-2">
          <Plus size={16} />
          <span>New Category</span>
        </Button>
      }
    >
      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton height="60px" className="w-full" />
          <Skeleton height="60px" className="w-full" />
          <Skeleton height="60px" className="w-full" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center mx-auto text-text-muted mb-4">
            <Folder size={24} />
          </div>
          <h3 className="text-18 font-semibold text-text mb-2">No categories yet</h3>
          <p className="text-14 text-text-muted mb-6">
            Get started by creating the first category for your organization.
          </p>
          <Button onClick={openCreateCategory} className="inline-flex items-center gap-2">
            <Plus size={16} />
            <span>Create First Category</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const isCatExpanded = !!expandedCats[cat.id];
            const cols = collectionsCache[cat.id] || [];

            return (
              <Card key={cat.id} className="p-0 overflow-hidden">
                {/* Category Header Bar */}
                <div className="p-4 bg-surface hover:bg-surface-hover/50 flex items-center justify-between border-b border-border/50 transition-colors">
                  <div
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <button className="text-text-muted hover:text-text">
                      {isCatExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Folder size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-16 text-text truncate block">{cat.name}</span>
                      {cat.description && (
                        <span className="text-12 text-text-muted truncate block">{cat.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openCreateCollection(cat.id)}
                      className="text-12 h-8 px-2.5 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Add Collection</span>
                    </Button>
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 size={16} />
                    </button>
                    {isOrgAdmin && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-surface-hover transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Collections List */}
                {isCatExpanded && (
                  <div className="p-4 pl-8 sm:pl-12 bg-bg/40 space-y-3">
                    {cols.length === 0 ? (
                      <div className="text-14 text-text-muted py-2 italic flex items-center justify-between">
                        <span>No collections in this category yet.</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openCreateCollection(cat.id)}
                          className="text-12 h-7"
                        >
                          <Plus size={12} className="mr-1" /> Add Collection
                        </Button>
                      </div>
                    ) : (
                      cols.map((col) => {
                        const isColExpanded = !!expandedCols[col.id];
                        const subs = subjectsCache[col.id] || [];

                        return (
                          <div
                            key={col.id}
                            className="border border-border/80 rounded-xl bg-surface overflow-hidden"
                          >
                            {/* Collection Header Bar */}
                            <div className="p-3.5 flex items-center justify-between border-b border-border/40">
                              <div
                                onClick={() => toggleCollection(col.id)}
                                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                              >
                                <button className="text-text-muted hover:text-text">
                                  {isColExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                                  <FolderOpen size={14} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-14 text-text truncate block">{col.name}</span>
                                  {col.description && (
                                    <span className="text-12 text-text-muted truncate block">{col.description}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openCreateSubject(col.id)}
                                  className="text-12 h-7 px-2 flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  <span className="hidden sm:inline">Add Subject</span>
                                </Button>
                                <button
                                  onClick={() => openEditCollection(col)}
                                  className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {isOrgAdmin && (
                                  <button
                                    onClick={() => handleDeleteCollection(col)}
                                    className="p-1 text-text-muted hover:text-danger rounded-lg hover:bg-surface-hover"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Subjects List */}
                            {isColExpanded && (
                              <div className="p-3 pl-8 sm:pl-10 bg-bg/20 space-y-2.5">
                                {subs.length === 0 ? (
                                  <div className="text-12 text-text-muted py-2 italic flex items-center justify-between">
                                    <span>No subjects in this collection yet.</span>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openCreateSubject(col.id)}
                                      className="text-12 h-6 px-2"
                                    >
                                      <Plus size={12} className="mr-1" /> Add Subject
                                    </Button>
                                  </div>
                                ) : (
                                  subs.map((sub) => {
                                    const isSubExpanded = !!expandedSubs[sub.id];
                                    const topics = topicsCache[sub.id] || [];

                                    return (
                                      <div
                                        key={sub.id}
                                        className="border border-border/60 rounded-lg bg-surface/80 overflow-hidden"
                                      >
                                        {/* Subject Bar */}
                                        <div className="p-3 flex items-center justify-between border-b border-border/30">
                                          <div
                                            onClick={() => toggleSubject(sub.id)}
                                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                                          >
                                            <button className="text-text-muted hover:text-text">
                                              {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                              <Book size={12} />
                                            </div>
                                            <div className="min-w-0">
                                              <span className="font-medium text-14 text-text truncate block">{sub.name}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 ml-3">
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              onClick={() => openCreateTopic(sub.id)}
                                              className="text-12 h-6 px-2 flex items-center gap-1"
                                            >
                                              <Plus size={12} />
                                              <span className="hidden sm:inline">Add Topic</span>
                                            </Button>
                                            <button
                                              onClick={() => openEditSubject(sub)}
                                              className="p-1 text-text-muted hover:text-text rounded"
                                            >
                                              <Edit2 size={13} />
                                            </button>
                                            {isOrgAdmin && (
                                              <button
                                                onClick={() => handleDeleteSubject(sub)}
                                                className="p-1 text-text-muted hover:text-danger rounded"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Topics List */}
                                        {isSubExpanded && (
                                          <div className="p-2.5 pl-6 sm:pl-8 space-y-1.5 bg-bg/30">
                                            {topics.length === 0 ? (
                                              <div className="text-12 text-text-muted py-1.5 italic flex items-center justify-between">
                                                <span>No topics yet.</span>
                                                <Button
                                                  variant="secondary"
                                                  size="sm"
                                                  onClick={() => openCreateTopic(sub.id)}
                                                  className="text-12 h-6 px-2"
                                                >
                                                  <Plus size={12} className="mr-1" /> Add Topic
                                                </Button>
                                              </div>
                                            ) : (
                                              topics.map((top) => (
                                                <div
                                                  key={top.id}
                                                  className="p-2.5 rounded-lg bg-surface border border-border/40 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                                                >
                                                  <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-12 font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-hover">
                                                      #{top.order}
                                                    </span>
                                                    <FileText size={14} className="text-primary shrink-0" />
                                                    <span className="text-14 font-medium text-text truncate">
                                                      {top.title}
                                                    </span>
                                                    {top.youtubeUrl && (
                                                      <span className="text-10 px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 hidden sm:inline">
                                                        Video
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <a
                                                      href={`/topics/${top.id}`}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="p-1 text-text-muted hover:text-primary rounded"
                                                      title="Preview Topic"
                                                    >
                                                      <ExternalLink size={14} />
                                                    </a>
                                                    <button
                                                      onClick={() => openEditTopic(top)}
                                                      className="p-1 text-text-muted hover:text-text rounded"
                                                      title="Edit Topic"
                                                    >
                                                      <Edit2 size={13} />
                                                    </button>
                                                    {isOrgAdmin && (
                                                      <button
                                                        onClick={() => handleDeleteTopic(top)}
                                                        className="p-1 text-text-muted hover:text-danger rounded"
                                                        title="Delete Topic"
                                                      >
                                                        <Trash2 size={13} />
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reusable Modal for Hierarchy Creation & Editing */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setModal(null)}
              className="absolute right-4 top-4 p-1.5 text-text-muted hover:text-text rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-20 font-semibold text-text mb-4">
              {modal.type === 'createCategory' && 'Create Category'}
              {modal.type === 'editCategory' && 'Edit Category'}
              {modal.type === 'createCollection' && 'Create Collection'}
              {modal.type === 'editCollection' && 'Edit Collection'}
              {modal.type === 'createSubject' && 'Create Subject'}
              {modal.type === 'editSubject' && 'Edit Subject'}
              {modal.type === 'createTopic' && 'Create Topic'}
              {modal.type === 'editTopic' && 'Edit Topic'}
            </h3>

            {formError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {modal.type.includes('Topic') ? (
                <>
                  <Input
                    label="Topic Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g. Introduction to TypeScript"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      placeholder="0"
                    />
                    <Input
                      label="YouTube URL (optional)"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div>
                    <label className="block text-14 text-text-muted mb-1">
                      Content (Markdown supported)
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={8}
                      className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                      placeholder="## Overview&#10;&#10;Write lesson markdown content here..."
                    />
                  </div>

                  <div>
                    <label className="block text-14 text-text-muted mb-1">
                      Attach Material or Video
                    </label>
                    <FileUpload
                      onUploadSuccess={(file) => {
                        if (
                          file.mimeType.includes('video') ||
                          file.name.endsWith('.mp4') ||
                          file.name.endsWith('.webm')
                        ) {
                          setFormData((prev) => ({ ...prev, videoUrl: file.url }));
                        }
                        setFormData((prev) => ({
                          ...prev,
                          content: `${prev.content}\n\n[Download ${file.name}](${file.url})`,
                        }));
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Computer Science"
                  />
                  <div>
                    <label className="block text-14 text-text-muted mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg bg-surface border border-border p-3 text-14 text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Brief description..."
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Layout>
  );
};
