import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs, BreadcrumbItem } from '../components/Breadcrumbs';
import { Markdown } from '../components/Markdown';
import { apiFetch } from '../lib/api';
import { Topic, Material, Progress } from '@learnstack/shared';
import { Download, FileText, ArrowLeft, CheckCircle2, Play } from 'lucide-react';

interface ExtendedTopic extends Omit<Topic, 'subject'> {
  materials?: Material[];
  subject?: {
    id: string;
    name: string;
    collection: {
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
      };
    };
  };
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube-nocookie.com/embed/${match[2]}`
      : null;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const TopicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<ExtendedTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Progress state
  const [completed, setCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [lastPosition, setLastPosition] = useState(0);

  // Video reference
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    async function loadTopicAndProgress() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const [topicData, progressList] = await Promise.all([
          apiFetch<ExtendedTopic>(`/v1/topics/${id}`),
          apiFetch<Progress[]>('/v1/progress').catch(() => []),
        ]);

        setTopic(topicData);

        const currentProg = progressList.find((p) => p.topicId === id);
        if (currentProg) {
          setCompleted(currentProg.completed);
          setLastPosition(currentProg.lastPosition);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load topic');
      } finally {
        setLoading(false);
      }
    }
    loadTopicAndProgress();
  }, [id]);

  // Restore video position once video metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current && lastPosition > 0) {
      videoRef.current.currentTime = lastPosition;
    }
  };

  // Save video playback position every 10 seconds
  const handleTimeUpdate = () => {
    if (!videoRef.current || !id) return;
    const current = Math.floor(videoRef.current.currentTime);

    // Save every 10 seconds
    if (Math.abs(current - lastSaveTimeRef.current) >= 10) {
      lastSaveTimeRef.current = current;
      apiFetch(`/v1/topics/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ lastPosition: current }),
      }).catch(console.error);
    }
  };

  const handleVideoEnded = async () => {
    if (!id || completed) return;
    try {
      await apiFetch(`/v1/topics/${id}/complete`, { method: 'POST' });
      setCompleted(true);
    } catch (err) {
      console.error('Failed to mark topic completed on video end', err);
    }
  };

  const handleMarkComplete = async () => {
    if (!id || completed) return;
    try {
      setMarkingComplete(true);
      await apiFetch(`/v1/topics/${id}/complete`, { method: 'POST' });
      setCompleted(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton height="24px" className="w-1/3" />
          <Skeleton height="36px" className="w-2/3" />
          <Skeleton height="350px" className="w-full" />
          <Skeleton height="150px" className="w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !topic) {
    return (
      <Layout>
        <div className="text-center py-16 bg-surface rounded-xl border border-border p-8 shadow-sm">
          <h3 className="text-20 font-bold text-text mb-2">Lesson Not Found</h3>
          <p className="text-14 text-text-muted mb-6">
            {error || 'The requested lesson does not exist or you do not have permission to view it.'}
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-[#0A1628] font-semibold text-14 hover:bg-primary-hover transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Catalog</span>
          </Link>
        </div>
      </Layout>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  if (topic.subject?.collection?.category) {
    breadcrumbs.push({
      label: topic.subject.collection.category.name,
      to: `/browse?category=${topic.subject.collection.category.id}`,
    });
  }
  if (topic.subject?.collection) {
    breadcrumbs.push({
      label: topic.subject.collection.name,
      to: `/browse?category=${topic.subject.collection.category?.id}&collection=${topic.subject.collection.id}`,
    });
  }
  if (topic.subject) {
    breadcrumbs.push({
      label: topic.subject.name,
      to: `/browse?category=${topic.subject.collection?.category?.id}&collection=${topic.subject.collection?.id}&subject=${topic.subject.id}`,
    });
  }
  breadcrumbs.push({
    label: topic.title,
  });

  const youtubeEmbedUrl = topic.youtubeUrl ? getYouTubeEmbedUrl(topic.youtubeUrl) : null;
  const directVideoUrl = topic.videoUrl;

  return (
    <Layout>
      <Breadcrumbs items={breadcrumbs} />

      <div className="space-y-8">
        {/* Topic Header */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-12 font-mono px-2.5 py-0.5 rounded bg-surface border border-border text-primary">
                Topic #{topic.order}
              </span>
              <span className="text-12 text-text-muted">
                {new Date(topic.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-32 font-semibold text-text tracking-tight">{topic.title}</h1>
          </div>

          {/* Mark as Complete CTA */}
          <div className="shrink-0">
            {completed ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success/10 border border-success/30 text-success font-medium text-14">
                <CheckCircle2 size={18} />
                <span>Completed</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleMarkComplete}
                disabled={markingComplete}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{markingComplete ? 'Marking...' : 'Mark as Complete'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Video Player Embed: YouTube or Direct HTML5 with Resume */}
        {directVideoUrl ? (
          <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video w-full shadow-lg relative">
            <video
              ref={videoRef}
              src={directVideoUrl}
              controls
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-contain"
            />
            {lastPosition > 0 && (
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-text text-12 px-2.5 py-1 rounded-md flex items-center gap-1.5 pointer-events-none">
                <Play size={12} className="text-primary fill-primary" />
                <span>Resuming at {Math.floor(lastPosition / 60)}:{(lastPosition % 60).toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        ) : youtubeEmbedUrl ? (
          <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video w-full shadow-lg">
            <iframe
              src={youtubeEmbedUrl}
              title={topic.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}

        {/* Markdown Content */}
        <Card className="p-8">
          <Markdown content={topic.content} />
        </Card>

        {/* Materials / Downloads Section */}
        {topic.materials && topic.materials.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-20 font-semibold text-text flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              <span>Supplementary Materials ({topic.materials.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topic.materials.map((mat) => (
                <a
                  key={mat.id}
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-4 rounded-xl bg-surface border border-border hover:border-primary hover:bg-surface-hover transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center text-text-muted group-hover:text-primary transition-colors shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-14 font-medium text-text truncate group-hover:text-primary transition-colors">
                        {mat.name}
                      </div>
                      <div className="text-12 text-text-muted">
                        {formatBytes(mat.sizeBytes)} • {mat.mimeType.split('/')[1] || mat.mimeType}
                      </div>
                    </div>
                  </div>
                  <Download size={18} className="text-text-muted group-hover:text-primary transition-colors shrink-0 ml-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
