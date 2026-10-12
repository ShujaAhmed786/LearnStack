import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { api } from '../lib/api';
import { Tactic } from '@learnstack/shared';
import {
  Zap,
  ArrowLeft,
  Clock,
  TrendingUp,
  DollarSign,
  Compass,
  Code2,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

export const TacticDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tactic, setTactic] = useState<Tactic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchTactic() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<Tactic>(`/v1/tactics/${id}`);
        setTactic(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tactic details');
      } finally {
        setLoading(false);
      }
    }

    fetchTactic();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-8">
          <Skeleton height="24px" className="w-48" />
          <div className="space-y-4">
            <Skeleton height="40px" className="w-3/4" />
            <Skeleton height="20px" className="w-1/2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
          <Skeleton height="240px" />
          <Skeleton height="360px" />
        </div>
      </Layout>
    );
  }

  if (error || !tactic) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Breadcrumbs items={[{ label: 'Tactics', to: '/tactics' }, { label: 'Error' }]} />
          <div className="p-12 text-center rounded-xl bg-surface border border-border space-y-4">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
              <Zap size={24} />
            </div>
            <h2 className="text-20 font-bold text-text">Tactic Not Found</h2>
            <p className="text-14 text-text-muted max-w-md mx-auto">
              {error || "The tactic you requested couldn't be loaded or doesn't exist."}
            </p>
            <div className="pt-2">
              <Link
                to="/tactics"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-bg font-semibold text-14 hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Return to Tactics Library</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Navigation & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Breadcrumbs
            items={[
              { label: 'Tactics', to: '/tactics' },
              { label: tactic.title },
            ]}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-13 font-medium text-text-muted hover:text-text transition-colors"
              title="Copy link to clipboard"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Share</span>
                </>
              )}
            </button>

            <Link
              to="/tactics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-13 font-medium text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={14} />
              <span>All Tactics</span>
            </Link>
          </div>
        </div>

        {/* Header Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`text-12 px-3 py-1 rounded-full border font-semibold tracking-wide uppercase ${getCategoryBadge(
                tactic.category
              )}`}
            >
              {tactic.category.replace(/_/g, ' ')}
            </span>
          </div>

          <h1 className="text-28 md:text-36 font-heading font-bold text-text tracking-tight leading-tight">
            {tactic.title}
          </h1>

          <p className="text-16 md:text-18 text-text-muted leading-relaxed max-w-3xl">
            {tactic.description}
          </p>
        </div>

        {/* Key Metrics / Badges Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Impact Badge */}
          <Card className="p-4 bg-surface border-border flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${getImpactBadge(
                tactic.impact
              )}`}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-12 font-medium text-text-muted uppercase tracking-wider">
                Impact
              </div>
              <div className="text-16 font-bold text-text mt-0.5">
                {tactic.impact} Impact
              </div>
            </div>
          </Card>

          {/* Effort Badge */}
          <Card className="p-4 bg-surface border-border flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${getEffortBadge(
                tactic.effort
              )}`}
            >
              <Clock size={20} />
            </div>
            <div>
              <div className="text-12 font-medium text-text-muted uppercase tracking-wider">
                Effort
              </div>
              <div className="text-16 font-bold text-text mt-0.5">
                {tactic.effort}
              </div>
            </div>
          </Card>

          {/* Savings / Value Badge */}
          <Card className="p-4 bg-surface border-border flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="text-12 font-medium text-text-muted uppercase tracking-wider">
                Expected Value / ROI
              </div>
              <div className="text-16 font-bold text-text mt-0.5 truncate max-w-[200px]" title={tactic.savingsEstimate || 'High leverage'}>
                {tactic.savingsEstimate || 'Operational leverage'}
              </div>
            </div>
          </Card>
        </div>

        {/* Section 1: Overview */}
        <Card className="p-6 md:p-8 bg-surface border-border space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CheckCircle2 size={18} />
            </div>
            <h2 className="text-20 font-heading font-bold text-text">Overview</h2>
          </div>
          <div className="text-15 text-text leading-relaxed space-y-3">
            <p>{tactic.description}</p>
            {tactic.savingsEstimate && (
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/15 flex items-center gap-2.5 text-14 text-text">
                <DollarSign size={18} className="text-primary shrink-0" />
                <span>
                  <strong>Financial & Resource Impact:</strong> {tactic.savingsEstimate}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Section 2: How to use */}
        {tactic.howToUse && (
          <Card className="p-6 md:p-8 bg-surface border-border space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                <Compass size={18} />
              </div>
              <h2 className="text-20 font-heading font-bold text-text">How to Use</h2>
            </div>
            <div className="text-15 text-text leading-relaxed whitespace-pre-line">
              {tactic.howToUse}
            </div>
          </Card>
        )}

        {/* Section 3: How to implement (with Markdown & Code Blocks) */}
        {tactic.howToImplement && (
          <Card className="p-6 md:p-8 bg-surface border-border space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Code2 size={18} />
              </div>
              <h2 className="text-20 font-heading font-bold text-text">How to Implement</h2>
            </div>
            <div className="text-15 text-text">
              <Markdown content={tactic.howToImplement} />
            </div>
          </Card>
        )}

        {/* Section 4: When it's useful */}
        {tactic.whenUseful && (
          <Card className="p-6 md:p-8 bg-surface border-border space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Lightbulb size={18} />
              </div>
              <h2 className="text-20 font-heading font-bold text-text">When It&apos;s Useful</h2>
            </div>
            <div className="text-15 text-text leading-relaxed whitespace-pre-line">
              {tactic.whenUseful}
            </div>
          </Card>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
          <Link
            to="/tactics"
            className="inline-flex items-center gap-2 text-14 font-medium text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to all tactics</span>
          </Link>

          <Link
            to="/practices"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-14 font-medium text-text transition-colors"
          >
            <span>Explore Engineering Practices</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};
