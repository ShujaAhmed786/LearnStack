import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { AdminStats } from '@learnstack/shared';
import {
  Users,
  FileText,
  CheckSquare,
  Award,
  ArrowRight,
  Settings,
  BookOpen,
  BookText,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const data = await api.get<AdminStats>('/v1/admin/stats');
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-24 font-bold text-text">Admin Dashboard</h1>
          <p className="text-14 text-text-muted mt-1">
            Overview of your organization's members, content hierarchy, and learner activity.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton height="110px" />
            <Skeleton height="110px" />
            <Skeleton height="110px" />
            <Skeleton height="110px" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-surface border-border flex items-center justify-between">
              <div>
                <p className="text-12 font-medium text-text-muted uppercase tracking-wider">
                  Total Users
                </p>
                <p className="text-28 font-extrabold text-text mt-1">{stats.userCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users size={22} />
              </div>
            </Card>

            <Card className="p-5 bg-surface border-border flex items-center justify-between">
              <div>
                <p className="text-12 font-medium text-text-muted uppercase tracking-wider">
                  Topics Published
                </p>
                <p className="text-28 font-extrabold text-text mt-1">
                  {stats.contentCounts.topics}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText size={22} />
              </div>
            </Card>

            <Card className="p-5 bg-surface border-border flex items-center justify-between">
              <div>
                <p className="text-12 font-medium text-text-muted uppercase tracking-wider">
                  Quizzes
                </p>
                <p className="text-28 font-extrabold text-text mt-1">
                  {stats.contentCounts.quizzes}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CheckSquare size={22} />
              </div>
            </Card>

            <Card className="p-5 bg-surface border-border flex items-center justify-between">
              <div>
                <p className="text-12 font-medium text-text-muted uppercase tracking-wider">
                  Quiz Attempts
                </p>
                <p className="text-28 font-extrabold text-text mt-1">
                  {stats.quizAttempts}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Award size={22} />
              </div>
            </Card>
          </div>
        ) : null}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Users size={18} className="text-primary" />
              <span className="text-14 font-medium text-text">Manage Users</span>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/admin/courses"
            className="p-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} className="text-primary" />
              <span className="text-14 font-medium text-text">Edit Courses</span>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/admin/guides"
            className="p-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <BookText size={18} className="text-primary" />
              <span className="text-14 font-medium text-text">Practice Guides</span>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/admin/settings"
            className="p-4 rounded-xl bg-surface border border-border hover:border-border-hover transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-primary" />
              <span className="text-14 font-medium text-text">Org Settings</span>
            </div>
            <ArrowRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Recent Signups Table */}
        <Card className="p-6 bg-surface border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-16 font-bold text-text">Recent Signups</h2>
              <p className="text-12 text-text-muted">Latest registered organization members.</p>
            </div>
            <Link
              to="/admin/users"
              className="text-13 text-primary hover:underline font-medium flex items-center gap-1"
            >
              View all users <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <Skeleton height="150px" />
          ) : stats && stats.recentSignups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-13">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted font-medium">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {stats.recentSignups.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-3 font-medium text-text">{u.name}</td>
                      <td className="py-3 px-3 text-text-muted">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-11 font-mono bg-surface-hover border border-border text-text">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-11 font-medium ${
                            u.active !== false
                              ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                              : 'text-error bg-error/10 border border-error/20'
                          }`}
                        >
                          {u.active !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-muted">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-14 text-text-muted py-4">No recent signups found.</p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};
