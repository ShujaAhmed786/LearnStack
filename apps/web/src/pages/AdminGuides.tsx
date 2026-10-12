import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Markdown } from '../components/Markdown';
import { api } from '../lib/api';
import { Guide, GuideCategory } from '@learnstack/shared';
import {
  BookText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  FileEdit,
  Eye,
  Code,
  X,
} from 'lucide-react';

const CATEGORIES: GuideCategory[] = [
  'TEAM_COMMUNICATION',
  'DEV_WORKFLOW',
  'REAL_INCIDENTS',
  'COST_CUTTING',
  'AUTOMATION',
  'RELIABILITY',
];

export const AdminGuides: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal State
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write');

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState<GuideCategory>('DEV_WORKFLOW');
  const [formDifficulty, setFormDifficulty] = useState('Intermediate');
  const [formReadTime, setFormReadTime] = useState(7);
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPublished, setFormPublished] = useState(false);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const data = await api.get<Guide[]>('/v1/admin/guides');
      setGuides(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load guides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const openCreateModal = () => {
    setEditingGuide(null);
    setIsCreating(true);
    setFormTitle('');
    setFormSlug('');
    setFormCategory('DEV_WORKFLOW');
    setFormDifficulty('Intermediate');
    setFormReadTime(7);
    setFormSummary('');
    setFormContent('');
    setFormPublished(false);
    setPreviewTab('write');
  };

  const openEditModal = (guide: Guide) => {
    setEditingGuide(guide);
    setIsCreating(false);
    setFormTitle(guide.title);
    setFormSlug(guide.slug);
    setFormCategory(guide.category);
    setFormDifficulty(guide.difficulty);
    setFormReadTime(guide.readTimeMinutes);
    setFormSummary(guide.summary);
    setFormContent(guide.content);
    setFormPublished(guide.published);
    setPreviewTab('write');
  };

  const closeModal = () => {
    setEditingGuide(null);
    setIsCreating(false);
  };

  // Toggle published directly
  const handleTogglePublished = async (guide: Guide) => {
    try {
      const updated = await api.patch<Guide>(`/v1/admin/guides/${guide.id}`, {
        published: !guide.published,
      });

      setGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? { ...g, published: updated.published } : g))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update publication status');
    }
  };

  // Save Guide (Create or Update)
  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGuide) {
        // Update
        const updated = await api.patch<Guide>(`/v1/admin/guides/${editingGuide.id}`, {
          title: formTitle,
          slug: formSlug,
          category: formCategory,
          difficulty: formDifficulty,
          readTimeMinutes: formReadTime,
          summary: formSummary,
          content: formContent,
          published: formPublished,
        });

        setGuides((prev) =>
          prev.map((g) => (g.id === editingGuide.id ? updated : g))
        );
      } else {
        // Create
        const created = await api.post<Guide>('/v1/admin/guides', {
          title: formTitle,
          slug: formSlug,
          category: formCategory,
          difficulty: formDifficulty,
          readTimeMinutes: formReadTime,
          summary: formSummary,
          content: formContent,
          published: formPublished,
        });

        setGuides((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err: any) {
      alert(err.message || 'Failed to save guide');
    }
  };

  // Delete Guide
  const handleDeleteGuide = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guide?')) return;
    try {
      await api.delete(`/v1/admin/guides/${id}`);
      setGuides((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete guide');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookText size={22} className="text-primary" />
              <h1 className="text-24 font-bold text-text">Practice Guides Management</h1>
            </div>
            <p className="text-14 text-text-muted mt-1">
              Create, edit, and publish in-depth architectural guides and production playbooks.
            </p>
          </div>

          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={16} /> Create Guide
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Guides Table */}
        <Card className="bg-surface border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-13">
                <thead>
                  <tr className="bg-surface-hover/60 border-b border-border text-text-muted font-medium">
                    <th className="py-3 px-4">Title & Slug</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Read Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {guides.map((g) => (
                    <tr key={g.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-text">{g.title}</div>
                        <div className="text-11 text-text-muted font-mono">{g.slug}</div>
                      </td>

                      <td className="py-3.5 px-4 text-text-muted">
                        <span className="px-2 py-0.5 rounded bg-surface-hover text-11 border border-border">
                          {g.category.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-text-muted">{g.difficulty}</td>

                      <td className="py-3.5 px-4 text-text-muted">{g.readTimeMinutes} min</td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(g)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-11 font-medium transition-colors border ${
                            g.published
                              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/20'
                              : 'text-text-muted bg-surface-hover border-border hover:text-text'
                          }`}
                        >
                          {g.published ? (
                            <>
                              <CheckCircle2 size={12} /> Published
                            </>
                          ) : (
                            <>
                              <FileEdit size={12} /> Draft
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(g)}
                          className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                          title="Edit Guide"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => handleDeleteGuide(g.id)}
                          className="p-1 rounded text-text-muted hover:text-error hover:bg-surface-hover transition-colors"
                          title="Delete Guide"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal: Create / Edit Guide with Markdown Editor */}
        {(isCreating || editingGuide) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col p-6 bg-surface border-border shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
                <h3 className="text-18 font-bold text-text">
                  {editingGuide ? 'Edit Guide' : 'Create New Guide'}
                </h3>
                <button onClick={closeModal} className="text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form
                onSubmit={handleSaveGuide}
                className="flex-1 overflow-y-auto py-4 space-y-4 pr-1"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Guide Title"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!formSlug) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, '')
                            .replace(/\s+/g, '-')
                        );
                      }
                    }}
                    placeholder="e.g. Incident Communication Roles"
                    required
                  />

                  <Input
                    label="Slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. incident-communication-roles"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-13 font-medium text-text mb-1.5">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as GuideCategory)}
                      className="w-full rounded-lg bg-bg border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-13 font-medium text-text mb-1.5">Difficulty</label>
                    <select
                      value={formDifficulty}
                      onChange={(e) => setFormDifficulty(e.target.value)}
                      className="w-full rounded-lg bg-bg border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <Input
                    label="Read Time (Minutes)"
                    type="number"
                    value={formReadTime}
                    onChange={(e) => setFormReadTime(parseInt(e.target.value) || 5)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">Summary</label>
                  <textarea
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-bg border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary"
                    placeholder="2-3 sentence overview of this guide..."
                    required
                  />
                </div>

                {/* Markdown Editor Tabs */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-13 font-medium text-text">Markdown Content</label>
                    <div className="flex items-center gap-1 bg-bg p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('write')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-12 font-medium transition-colors ${
                          previewTab === 'write'
                            ? 'bg-surface text-primary shadow-sm'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        <Code size={13} /> Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('preview')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-12 font-medium transition-colors ${
                          previewTab === 'preview'
                            ? 'bg-surface text-primary shadow-sm'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        <Eye size={13} /> Preview
                      </button>
                    </div>
                  </div>

                  {previewTab === 'write' ? (
                    <textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      rows={12}
                      className="w-full rounded-lg bg-bg border border-border p-3 text-13 font-mono text-text focus:outline-none focus:border-primary"
                      placeholder="# Guide Heading&#10;&#10;Write detailed technical guide using standard markdown..."
                      required
                    />
                  ) : (
                    <div className="p-4 rounded-lg bg-bg border border-border min-h-[300px] max-h-[400px] overflow-y-auto">
                      <Markdown content={formContent || '*No content written yet.*'} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="formPublished"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-bg"
                  />
                  <label htmlFor="formPublished" className="text-13 font-medium text-text">
                    Publish this guide immediately (visible to all learners)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingGuide ? 'Save Changes' : 'Create Guide'}
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
