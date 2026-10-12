import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { api } from '../lib/api';
import { Tactic, GuideCategory } from '@learnstack/shared';
import {
  Zap,
  Filter,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Search,
  X,
} from 'lucide-react';

type CategoryFilter = GuideCategory | 'ALL';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All Tactics' },
  { key: 'COST_CUTTING', label: 'Cost Cutting' },
  { key: 'SCALABILITY', label: 'Scalability' },
  { key: 'RELIABILITY', label: 'Reliability' },
];

export const TacticsList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCat = searchParams.get('category');
  const activeCategory: CategoryFilter = (rawCat as CategoryFilter) || 'ALL';

  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTactics() {
      try {
        setLoading(true);
        const url =
          activeCategory === 'ALL'
            ? '/v1/tactics'
            : `/v1/tactics?category=${activeCategory}`;
        const data = await api.get<Tactic[]>(url);
        setTactics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tactics');
      } finally {
        setLoading(false);
      }
    }
    fetchTactics();
  }, [activeCategory]);

  const handleSelectCategory = (cat: GuideCategory | 'ALL') => {
    if (cat === 'ALL') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  };

  const filteredTactics = useMemo(() => {
    if (!searchQuery.trim()) return tactics;
    const q = searchQuery.toLowerCase().trim();
    return tactics.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchUse = t.howToUse?.toLowerCase().includes(q);
      const matchImpl = t.howToImplement?.toLowerCase().includes(q);
      const matchWhen = t.whenUseful?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCat || matchUse || matchImpl || matchWhen;
    });
  }, [tactics, searchQuery]);

  const getImpactBadge = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'medium':
        return 'text-primary bg-primary/10 border-primary/20';
      default:
        return 'text-text-muted bg-surface-hover border-border';
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort.toLowerCase()) {
      case 'hours':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'days':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'weeks':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-text-muted bg-surface-hover border-border';
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'COST_CUTTING':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25';
      case 'SCALABILITY':
        return 'text-primary bg-primary/10 border-primary/25';
      case 'RELIABILITY':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/25';
      default:
        return 'text-text-muted bg-surface-hover border-border';
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <Breadcrumbs items={[{ label: 'Tactics' }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Zap size={22} />
              </div>
              <h1 className="text-24 md:text-28 font-heading font-bold text-text">Tactics Library</h1>
            </div>
            <p className="text-14 text-text-muted max-w-2xl">
              24 researched, production-grade engineering tactics across cost cutting, scalability, and reliability with concrete implementation commands.
            </p>
          </div>

          <Link
            to="/practices"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-14 font-medium text-text transition-colors self-start md:self-auto shrink-0"
          >
            <BookOpen size={16} className="text-primary" />
            <span>Full Practice Guides</span>
            <ArrowLeft size={14} className="text-text-muted rotate-180" />
          </Link>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter size={16} className="text-text-muted shrink-0 mr-1" />
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleSelectCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-13 font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary text-bg font-semibold shadow-sm'
                      : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search within tactics */}
          <div className="relative sm:w-72 shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tactics..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-surface border border-border text-13 text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Counter indicator */}
        {!loading && !error && (
          <div className="text-12 text-text-muted font-medium">
            Showing {filteredTactics.length} {filteredTactics.length === 1 ? 'tactic' : 'tactics'}
            {activeCategory !== 'ALL' && ` in ${activeCategory.replace(/_/g, ' ')}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Tactics Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton height="220px" />
            <Skeleton height="220px" />
            <Skeleton height="220px" />
            <Skeleton height="220px" />
          </div>
        ) : filteredTactics.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-3">
            <p className="text-15 text-text font-medium">No tactics found matching your criteria.</p>
            <div className="flex items-center justify-center gap-3 pt-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg bg-surface-hover text-13 text-text border border-border hover:border-primary transition-colors"
                >
                  Clear search
                </button>
              )}
              {activeCategory !== 'ALL' && (
                <button
                  onClick={() => handleSelectCategory('ALL')}
                  className="px-3 py-1.5 rounded-lg bg-surface-hover text-13 text-text border border-border hover:border-primary transition-colors"
                >
                  Reset category filter
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTactics.map((tactic) => (
              <Link
                key={tactic.id}
                to={`/tactics/${tactic.id}`}
                className="group block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl"
              >
                <Card className="h-full p-6 bg-surface border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-11 px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${getCategoryBadge(
                          tactic.category
                        )}`}
                      >
                        {tactic.category.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-11 px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getImpactBadge(
                            tactic.impact
                          )}`}
                        >
                          <TrendingUp size={11} />
                          {tactic.impact}
                        </span>
                        <span
                          className={`text-11 px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1 ${getEffortBadge(
                            tactic.effort
                          )}`}
                        >
                          <Clock size={11} />
                          {tactic.effort}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-18 font-heading font-bold text-text group-hover:text-primary transition-colors">
                        {tactic.title}
                      </h2>
                      <p className="text-14 text-text-muted mt-2 leading-relaxed line-clamp-3">
                        {tactic.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
                    {tactic.savingsEstimate ? (
                      <div className="flex items-center gap-1.5 text-13 font-semibold text-emerald-500 truncate">
                        <DollarSign size={15} className="shrink-0" />
                        <span className="truncate">{tactic.savingsEstimate}</span>
                      </div>
                    ) : (
                      <div className="text-12 text-text-muted font-medium">
                        High operational leverage
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1 text-13 font-medium text-primary group-hover:translate-x-0.5 transition-transform shrink-0">
                      <span>View tactic</span>
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
