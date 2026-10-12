import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { api } from '../lib/api';
import { Guide } from '@learnstack/shared';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Share2,
  Check,
  List,
} from 'lucide-react';

export const PracticeDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchGuide() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await api.get<Guide>(`/v1/guides/${slug}`);
        setGuide(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load guide');
      } finally {
        setLoading(false);
      }
    }
    fetchGuide();
  }, [slug]);

  // Extract table of contents from markdown ## and ### headers
  const tableOfContents = useMemo(() => {
    if (!guide?.content) return [];
    const lines = guide.content.split('\n');
    const headers: { id: string; text: string; level: number }[] = [];

    for (const line of lines) {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        headers.push({ id, text, level });
      }
    }

    return headers;
  }, [guide?.content]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton height="60px" />
          <Skeleton height="200px" />
          <Skeleton height="400px" />
        </div>
      </Layout>
    );
  }

  if (error || !guide) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-8 rounded-xl bg-surface border border-border text-center space-y-4">
          <p className="text-error">{error || 'Guide not found'}</p>
          <Link
            to="/practices"
            className="inline-flex items-center gap-2 text-primary hover:underline text-14"
          >
            <ArrowLeft size={16} /> Back to Industry Practices
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Breadcrumbs
            className="mb-0"
            items={[
              { label: 'Practices', to: '/practices' },
              { label: guide.title || guide.category.replace(/_/g, ' ') },
            ]}
          />

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-12 text-text-muted hover:text-text transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} className="text-primary" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Share Guide</span>
              </>
            )}
          </button>
        </div>

        {/* Hero Header Card */}
        <Card className="p-8 bg-surface border-border space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-11 font-medium bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
              {guide.category.replace(/_/g, ' ')}
            </span>
            <span className="px-2.5 py-1 rounded-full text-11 font-medium bg-surface-hover border border-border text-text-muted">
              {guide.difficulty}
            </span>
            <span className="flex items-center gap-1.5 text-12 text-text-muted ml-2">
              <Clock size={13} />
              {guide.readTimeMinutes} min read
            </span>
          </div>

          <h1 className="text-28 sm:text-32 font-extrabold text-text tracking-tight">
            {guide.title}
          </h1>

          <p className="text-16 text-text-muted leading-relaxed max-w-3xl">
            {guide.summary}
          </p>
        </Card>

        {/* Article Layout with Sidebar Table of Contents */}
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          {/* Main Article Content */}
          <div className="flex-1 min-w-0 w-full">
            <Card className="p-8 bg-surface border-border">
              <Markdown content={guide.content} />
            </Card>
          </div>

          {/* Sticky Table of Contents */}
          {tableOfContents.length > 0 && (
            <div className="w-full lg:w-72 lg:sticky lg:top-20 shrink-0 space-y-4">
              <Card className="p-5 bg-surface border-border space-y-3 shadow-lg">
                <div className="flex items-center gap-2 text-13 font-semibold text-text uppercase tracking-wider border-b border-border pb-3">
                  <List size={15} className="text-primary" />
                  <span>On This Page</span>
                </div>
                <nav className="space-y-1.5 text-13">
                  {tableOfContents.map((header, idx) => (
                    <a
                      key={idx}
                      href={`#${header.id}`}
                      className={`block text-text-muted hover:text-primary transition-colors py-1 truncate ${
                        header.level === 3 ? 'pl-4 text-12' : 'font-medium'
                      }`}
                    >
                      {header.text}
                    </a>
                  ))}
                </nav>
              </Card>

              {/* Quick Jump back to list */}
              <Link
                to="/practices"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-surface hover:bg-surface-hover border border-border text-13 text-text-muted hover:text-text transition-colors"
              >
                <BookOpen size={15} />
                <span>Explore More Guides</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
