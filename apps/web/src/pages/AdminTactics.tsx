import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { api } from '../lib/api';
import { Tactic, GuideCategory } from '@learnstack/shared';
import { useToast } from '../context/ToastContext';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

const CATEGORIES: GuideCategory[] = [
  'COST_CUTTING',
  'SCALABILITY',
  'RELIABILITY',
  'AUTOMATION',
  'DEV_WORKFLOW',
  'TEAM_COMMUNICATION',
  'REAL_INCIDENTS',
];

export const AdminTactics: React.FC = () => {
  const { showToast } = useToast();
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [editingTactic, setEditingTactic] = useState<Tactic | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<GuideCategory>('COST_CUTTING');
  const [formDescription, setFormDescription] = useState('');
  const [formImpact, setFormImpact] = useState('High');
  const [formEffort, setFormEffort] = useState('Hours');
  const [formSavings, setFormSavings] = useState('');
  const [formPublished, setFormPublished] = useState(true);

  const fetchTactics = async () => {
    try {
      setLoading(true);
      const data = await api.get<Tactic[]>('/v1/admin/tactics');
      setTactics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tactics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTactics();
  }, []);

  const openCreateModal = () => {
    setEditingTactic(null);
    setIsCreating(true);
    setFormTitle('');
    setFormCategory('COST_CUTTING');
    setFormDescription('');
    setFormImpact('High');
    setFormEffort('Hours');
    setFormSavings('');
    setFormPublished(true);
  };

  const openEditModal = (tactic: Tactic) => {
    setEditingTactic(tactic);
    setIsCreating(false);
    setFormTitle(tactic.title);
    setFormCategory(tactic.category);
    setFormDescription(tactic.description);
    setFormImpact(tactic.impact);
    setFormEffort(tactic.effort);
    setFormSavings(tactic.savingsEstimate || '');
    setFormPublished(tactic.published);
  };

  const closeModal = () => {
    setEditingTactic(null);
    setIsCreating(false);
  };

  const handleSaveTactic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTactic) {
        // Update
        const updated = await api.patch<Tactic>(`/v1/admin/tactics/${editingTactic.id}`, {
          title: formTitle,
          category: formCategory,
          description: formDescription,
          impact: formImpact,
          effort: formEffort,
          savingsEstimate: formSavings || null,
          published: formPublished,
        });

        setTactics((prev) =>
          prev.map((t) => (t.id === editingTactic.id ? updated : t))
        );
      } else {
        // Create
        const created = await api.post<Tactic>('/v1/admin/tactics', {
          title: formTitle,
          category: formCategory,
          description: formDescription,
          impact: formImpact,
          effort: formEffort,
          savingsEstimate: formSavings || null,
          published: formPublished,
        });

        setTactics((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to save tactic', 'error');
    }
  };

  const handleDeleteTactic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tactic?')) return;
    try {
      await api.delete(`/v1/admin/tactics/${id}`);
      setTactics((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tactic', 'error');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={22} className="text-primary" />
              <h1 className="text-24 font-bold text-text">Tactics Management</h1>
            </div>
            <p className="text-14 text-text-muted mt-1">
              Create and manage actionable high-leverage tactical engineering playbooks.
            </p>
          </div>

          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={16} /> Add Tactic
          </Button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Tactics Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton height="180px" />
            <Skeleton height="180px" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tactics.map((tactic) => (
              <Card
                key={tactic.id}
                className="p-5 bg-surface border-border hover:border-border-hover transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-11 font-medium text-text-muted uppercase tracking-wider">
                      {tactic.category.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-11 px-2 py-0.5 rounded bg-surface-hover border border-border text-text">
                        {tactic.impact} Impact
                      </span>
                      <span className="text-11 px-2 py-0.5 rounded bg-surface-hover border border-border text-text">
                        {tactic.effort}
                      </span>
                      <span
                        className={`text-11 px-2 py-0.5 rounded-full border font-medium ${
                          tactic.published
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                            : 'text-text-muted bg-surface-hover border-border'
                        }`}
                      >
                        {tactic.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-16 font-bold text-text">{tactic.title}</h2>
                    <p className="text-13 text-text-muted mt-1 leading-relaxed">
                      {tactic.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-12">
                  <span className="text-primary font-medium">
                    {tactic.savingsEstimate || 'N/A'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(tactic)}
                      className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteTactic(tactic.id)}
                      className="p-1 rounded text-text-muted hover:text-error hover:bg-surface-hover transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal: Create / Edit Tactic */}
        {(isCreating || editingTactic) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-lg p-6 bg-surface border-border space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-18 font-bold text-text">
                  {editingTactic ? 'Edit Tactic' : 'Add Tactic'}
                </h3>
                <button onClick={closeModal} className="text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTactic} className="space-y-4">
                <Input
                  label="Tactic Title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. fck-nat instance replacement"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-13 font-medium text-text mb-1.5">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as GuideCategory)}
                      className="w-full rounded-lg bg-bg border border-border p-2 text-13 text-text focus:outline-none focus:border-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-13 font-medium text-text mb-1.5">Impact</label>
                    <select
                      value={formImpact}
                      onChange={(e) => setFormImpact(e.target.value)}
                      className="w-full rounded-lg bg-bg border border-border p-2 text-13 text-text focus:outline-none focus:border-primary"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-13 font-medium text-text mb-1.5">Effort</label>
                    <select
                      value={formEffort}
                      onChange={(e) => setFormEffort(e.target.value)}
                      className="w-full rounded-lg bg-bg border border-border p-2 text-13 text-text focus:outline-none focus:border-primary"
                    >
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-13 font-medium text-text mb-1.5">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg bg-bg border border-border p-2.5 text-13 text-text focus:outline-none focus:border-primary"
                    placeholder="2-3 sentence technical description of the tactical decision..."
                    required
                  />
                </div>

                <Input
                  label="Estimated Savings / ROI (Optional)"
                  value={formSavings}
                  onChange={(e) => setFormSavings(e.target.value)}
                  placeholder="e.g. $30/month per VPC or 20% off compute"
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="formTacticPublished"
                    checked={formPublished}
                    onChange={(e) => setFormPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-bg"
                  />
                  <label htmlFor="formTacticPublished" className="text-13 font-medium text-text">
                    Publish immediately (visible to all learners)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button variant="ghost" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTactic ? 'Save Changes' : 'Add Tactic'}
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
