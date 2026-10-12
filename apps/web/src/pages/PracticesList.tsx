import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { api } from '../lib/api';
import { Guide, GuideCategory } from '@learnstack/shared';
import {
  BookOpen,
  Clock,
  ArrowRight,
  Zap,
  Filter,
} from 'lucide-react';

type CategoryFilter = GuideCategory | 'ALL';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All Practices' },
  { key: 'TEAM_COMMUNICATION', label: 'Team Communication' },
  { key: 'DEV_WORKFLOW', label: 'Dev Workflow' },
  { key: 'REAL_INCIDENTS', label: 'Real Incidents' },
  { key: 'COST_CUTTING', label: 'Cost Cutting' },
  { key: 'AUTOMATION', label: 'Automation' },
  { key: 'RELIABILITY', label: 'Reliability' },
];

export const PracticesList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('category');
  const activeCategory: CategoryFilter = (rawCat as GuideCategory) || 'ALL';

  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuides() {
      try {
        setLoading(true);
        const url =
          activeCategory === 'ALL'
            ? '/v1/guides'
            : `/v1/guides?category=${activeCategory}`;
        const data = await api.get<Guide[]>(url);
        setGuides(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load guides');
      } finally {
        setLoading(false);
      }
    }
    fetchGuides();
  }, [activeCategory]);

  const handleSelectCategory = (cat: GuideCategory | 'ALL') => {
    if (cat === 'ALL') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'intermediate':
        return 'text-primary bg-primary/10 border-primary/20';
      case 'advanced':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-text-muted bg-surface-hover border-border';
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: 'Practices' }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <BookOpen size={22} />
              </div>
              <h1 className="text-24 font-bold text-text">Industry Practices</h1>
            </div>
            <p className="text-14 text-text-muted max-w-2xl">
              Battlefield-tested playbooks and architectural realities. Not introductory tutorials, but how distributed software actually runs in production.
            </p>
          </div>

          <Link
            to="/tactics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-14 font-medium text-text transition-colors self-start md:self-auto shrink-0"
          >
            <Zap size={16} className="text-primary" />
            <span>Tactics Library</span>
            <ArrowRight size={14} className="text-text-muted" />
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border scrollbar-none">
          <Filter size={16} className="text-text-muted shrink-0 mr-1" />
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleSelectCategory(cat.key)}
                className={`px-3.5 py-1.5 rounded-full text-13 font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-bg font-semibold'
                    : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Guides Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton height="220px" />
            <Skeleton height="220px" />
            <Skeleton height="220px" />
          </div>
        ) : guides.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-3">
            <p className="text-15 text-text font-medium">No guides found in this category.</p>
            <button
              onClick={() => handleSelectCategory('ALL')}
              className="text-13 text-primary hover:underline"
            >
              Reset category filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                to={`/practices/${guide.slug}`}
                className="group flex flex-col justify-between p-6 rounded-xl bg-surface border border-border hover:border-border-hover transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-11 font-medium text-text-muted tracking-wide uppercase">
                      {guide.category.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-11 px-2 py-0.5 rounded-full border font-medium ${getDifficultyColor(
                        guide.difficulty
                      )}`}
                    >
                      {guide.difficulty}
                    </span>
                  </div>

                  <h2 className="text-16 font-bold text-text group-hover:text-primary transition-colors line-clamp-2">
                    {guide.title}
                  </h2>

                  <p className="text-13 text-text-muted leading-relaxed line-clamp-3">
                    {guide.summary}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border/80 flex items-center justify-between text-12 text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} />
                    <span>{guide.readTimeMinutes} min read</span>
                  </div>
                  <span className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Read guide <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
