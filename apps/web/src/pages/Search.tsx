import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { apiFetch } from '../lib/api';
import { SearchResultTopic } from '@learnstack/shared';
import { Search as SearchIcon, ChevronRight } from 'lucide-react';

export const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<SearchResultTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    async function executeSearch() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<SearchResultTopic[]>(
          `/v1/search?q=${encodeURIComponent(query.trim())}`
        );
        setResults(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }

    executeSearch();
  }, [query]);

  return (
    <Layout
      title={`Search Results for "${query}"`}
      description={
        loading
          ? 'Searching the organization library...'
          : `Found ${results.length} ${results.length === 1 ? 'lesson' : 'lessons'} matching your query`
      }
    >
      <Breadcrumbs items={[{ label: 'Search' }, { label: query ? `"${query}"` : 'Query' }]} />

      {error && (
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-14 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-3">
              <Skeleton height="16px" className="w-1/4" />
              <Skeleton height="24px" className="w-1/2" />
              <Skeleton height="16px" className="w-full" />
            </Card>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-surface-hover border border-border flex items-center justify-center mx-auto text-text-muted mb-4">
            <SearchIcon size={24} className="text-primary" />
          </div>
          <h3 className="text-18 font-bold text-text mb-1">No matching lessons</h3>
          <p className="text-14 text-text-muted max-w-sm mx-auto">
            We couldn't find any lessons matching &quot;{query}&quot;. Try different keywords or browse curriculum.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((topic) => {
            const catName = topic.subject?.collection?.category?.name;
            const colName = topic.subject?.collection?.name;
            const subName = topic.subject?.name;

            return (
              <Link
                key={topic.id}
                to={`/topics/${topic.id}`}
                className="block group"
              >
                <Card className="p-6 hover:border-primary/50 hover:bg-surface-hover transition-all">
                  {/* Hierarchy breadcrumbs */}
                  <div className="flex items-center gap-1.5 text-12 text-text-muted mb-2 flex-wrap">
                    {catName && <span>{catName}</span>}
                    {colName && (
                      <>
                        <ChevronRight size={12} className="text-border" />
                        <span>{colName}</span>
                      </>
                    )}
                    {subName && (
                      <>
                        <ChevronRight size={12} className="text-border" />
                        <span>{subName}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-18 font-semibold text-text group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{topic.title}</span>
                    <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </h3>

                  <p className="text-14 text-text-muted mt-2 line-clamp-2">
                    {topic.content.replace(/^[#*`\- >]+/gm, '').slice(0, 160)}...
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
