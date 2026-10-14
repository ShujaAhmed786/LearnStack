import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { LiveSession, JoinLiveSessionResponse } from '@learnstack/shared';
import { useToast } from '../context/ToastContext';
import {
  Video,
  Radio,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Play,
  Square,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const LiveSessionRoom: React.FC = () => {
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [joinData, setJoinData] = useState<JoinLiveSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [timeLeftString, setTimeLeftString] = useState<string>('');

  const isStaff =
    user?.role === 'INSTRUCTOR' ||
    user?.role === 'ORG_ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  const fetchSessionAndJoin = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setNeedsRegistration(false);

      const sess = await api.get<LiveSession>(`/v1/live-sessions/${id}`);
      setSession(sess);

      // Attempt to join
      try {
        const join = await api.get<JoinLiveSessionResponse>(`/v1/live-sessions/${id}/join`);
        setJoinData(join);
      } catch (joinErr: any) {
        if (joinErr.status === 403 || joinErr.message?.includes('register')) {
          setNeedsRegistration(true);
        } else {
          setError(joinErr.message || 'Unable to join session at this time');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Session not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndJoin();
  }, [id]);

  // Live countdown timer
  useEffect(() => {
    if (!session || joinData) return;

    const interval = setInterval(() => {
      const diffMs = new Date(session.scheduledAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeftString('Starting now...');
        fetchSessionAndJoin();
      } else {
        const minutes = Math.floor(diffMs / (60 * 1000));
        const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
        setTimeLeftString(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, joinData]);

  const handleRegister = async () => {
    if (!id) return;
    try {
      setRegistering(true);
      await api.post(`/v1/live-sessions/${id}/register`);
      await fetchSessionAndJoin();
    } catch (err: any) {
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'LIVE' | 'ENDED') => {
    if (!id) return;
    try {
      setStatusUpdating(true);
      await api.patch(`/v1/live-sessions/${id}/status`, { status: newStatus });
      await fetchSessionAndJoin();
    } catch (err: any) {
      showToast(err.message || 'Failed to update session status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <Skeleton height="32px" className="w-48" />
          <Skeleton height="140px" className="rounded-xl" />
          <Skeleton height="500px" className="rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (error && !session) {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-8 bg-surface border border-border rounded-xl text-center space-y-4 shadow-sm">
          <p className="text-danger font-medium">{error || 'Session not found'}</p>
          <Link
            to="/live"
            className="inline-flex items-center gap-2 text-primary hover:underline text-14 font-medium"
          >
            <ArrowLeft size={16} /> Back to Live Classes
          </Link>
        </div>
      </Layout>
    );
  }

  const isLive = session?.status === 'LIVE';
  const isEnded = session?.status === 'ENDED' || session?.status === 'CANCELLED';

  // Construct Jitsi iframe URL with clean params
  const jitsiUrl = joinData?.meetingUrl
    ? `${joinData.meetingUrl}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(
        user?.name || 'LearnStack Student'
      )}`
    : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Live Classes', to: '/live' },
            { label: session?.title || 'Session Room' },
          ]}
        />

        {/* Top Session Control Header */}
        <Card className="p-6 bg-surface border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/15 text-danger font-bold text-11 border border-danger/30 animate-pulse">
                  <Radio size={13} className="animate-spin" />
                  <span>STREAMING LIVE NOW</span>
                </span>
              ) : isEnded ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-hover text-text-muted font-semibold text-11 border border-border">
                  <span>SESSION CONCLUDED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold text-11 border border-teal-500/20">
                  <Clock size={12} />
                  <span>SCHEDULED</span>
                </span>
              )}

              {session?.course && (
                <span className="text-12 font-medium text-text-muted">
                  • {session.course.title}
                </span>
              )}
            </div>

            <h1 className="text-22 font-bold text-text">{session?.title}</h1>
            {session?.description && (
              <p className="text-13 text-text-muted max-w-2xl">{session.description}</p>
            )}
          </div>

          {/* Instructor Controls */}
          {isStaff && (
            <div className="flex items-center gap-2.5 shrink-0">
              {session?.status === 'SCHEDULED' && (
                <Button
                  onClick={() => handleUpdateStatus('LIVE')}
                  disabled={statusUpdating}
                  className="bg-danger hover:bg-danger/90 text-white font-bold flex items-center gap-2 shadow-sm"
                >
                  <Play size={15} />
                  <span>Start Live Session</span>
                </Button>
              )}
              {session?.status === 'LIVE' && (
                <Button
                  onClick={() => handleUpdateStatus('ENDED')}
                  disabled={statusUpdating}
                  className="bg-surface border border-border text-text hover:bg-surface-hover font-semibold flex items-center gap-2"
                >
                  <Square size={15} className="text-danger" />
                  <span>End Live Session</span>
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Live Video Embed or Countdown Screen */}
        {jitsiUrl ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-border shadow-2xl">
              <iframe
                src={jitsiUrl}
                title={session?.title}
                allow="camera; microphone; display-capture; fullscreen; autoplay"
                className="w-full h-full border-0"
              />
            </div>
            <div className="flex items-center justify-between text-12 text-text-muted px-2">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-primary" />
                <span>Encrypted WebRTC via Jitsi Meet</span>
              </span>
              <a
                href={joinData?.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <span>Open in standalone window</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ) : needsRegistration ? (
          <Card className="p-10 bg-surface border-border text-center max-w-md mx-auto space-y-5 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Video size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-20 font-bold text-text">Session Registration Required</h3>
              <p className="text-13 text-text-muted leading-relaxed">
                To attend this live class and access the interactive video room, you must register for the session.
              </p>
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering}
              className="w-full bg-primary text-[#0A1628] hover:bg-primary-hover font-bold shadow-sm"
            >
              {registering ? 'Registering...' : 'Register Now to Join'}
            </Button>
          </Card>
        ) : isEnded ? (
          <Card className="p-12 bg-surface border-border text-center max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-surface-hover text-text-muted mx-auto flex items-center justify-center border border-border">
              <Square size={26} />
            </div>
            <div className="space-y-1">
              <h3 className="text-18 font-bold text-text">This Live Class Has Ended</h3>
              <p className="text-13 text-text-muted">
                Thank you for participating! Check upcoming live classes on the calendar.
              </p>
            </div>
            <Link
              to="/live"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-5 py-2.5 text-14 bg-surface border border-border text-text hover:bg-surface-hover shadow-sm mt-2"
            >
              View All Live Classes
            </Link>
          </Card>
        ) : (
          /* Waiting / Countdown state */
          <Card className="p-12 sm:p-16 bg-surface border-border text-center max-w-xl mx-auto space-y-6 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-500/20">
              <Clock size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-12 font-bold uppercase tracking-wider text-primary">
                Live Class Scheduled
              </span>
              <h2 className="text-24 font-bold text-text">Class Starts Soon</h2>
              <p className="text-14 text-text-muted max-w-md mx-auto leading-relaxed">
                The video meeting room opens automatically <strong className="text-text">15 minutes</strong> prior to the scheduled start time.
              </p>
            </div>

            {timeLeftString && (
              <div className="p-4 rounded-xl bg-surface-hover border border-border inline-block min-w-[200px]">
                <span className="text-11 text-text-muted uppercase tracking-wider font-semibold block mb-0.5">
                  Time Remaining
                </span>
                <span className="text-28 font-mono font-bold text-text">{timeLeftString}</span>
              </div>
            )}

            <div className="pt-2 text-12 text-text-muted flex items-center justify-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>You are registered! This page will refresh when the session opens.</span>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
