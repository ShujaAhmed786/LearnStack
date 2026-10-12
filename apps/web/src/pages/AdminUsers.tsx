import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Button } from '../components/Button';
import { useAuth } from '../lib/auth-context';
import { api } from '../lib/api';
import { User, Role, AdminUsersResponse } from '@learnstack/shared';
import {
  Users,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async (targetPage = page, searchTerm = search) => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        page: targetPage.toString(),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      });

      const data = await api.get<AdminUsersResponse>(`/v1/admin/users?${query.toString()}`);
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, search);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const updatedUser = await api.patch<User>(`/v1/admin/users/${userId}/role`, {
        role: newRole,
      });

      // Update state without reload
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  // Handle status toggle (activate / deactivate)
  const handleToggleStatus = async (user: User) => {
    const nextStatus = !user.active;
    try {
      const updatedUser = await api.patch<User>(`/v1/admin/users/${user.id}/status`, {
        active: nextStatus,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: updatedUser.active } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Handle delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.delete(`/v1/admin/users/${deleteTarget.id}`);

      // Remove from state without reload
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={22} className="text-primary" />
              <h1 className="text-24 font-bold text-text">User Management</h1>
            </div>
            <p className="text-14 text-text-muted mt-1">
              Manage member accounts, permissions, and active login access ({total} total).
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-9 pr-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-text-muted text-13 focus:outline-none focus:border-primary w-64"
              />
            </div>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-14">
            {error}
          </div>
        )}

        {/* Users Table */}
        <Card className="bg-surface border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
              <Skeleton height="40px" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-14">
              No users found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-13">
                <thead>
                  <tr className="bg-surface-hover/60 border-b border-border text-text-muted font-medium">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isTargetSuper = u.role === 'SUPER_ADMIN';

                    return (
                      <tr key={u.id} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-text">
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-10 px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-text-muted">{u.email}</td>

                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            disabled={isSelf || (isTargetSuper && !isSuperAdmin)}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as Role)
                            }
                            className="bg-bg border border-border text-text rounded px-2.5 py-1 text-12 font-medium focus:outline-none focus:border-primary disabled:opacity-50"
                          >
                            <option value="LEARNER">LEARNER</option>
                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                            <option value="ORG_ADMIN">ORG_ADMIN</option>
                            {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-11 font-medium ${
                              u.active !== false
                                ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                                : 'text-error bg-error/10 border border-error/20'
                            }`}
                          >
                            {u.active !== false ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                            {u.active !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-text-muted">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded text-11 font-medium transition-colors border ${
                              u.active !== false
                                ? 'border-border text-text-muted hover:text-error hover:border-error/40'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            } disabled:opacity-30 disabled:pointer-events-none`}
                          >
                            {u.active !== false ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            className="p-1 rounded text-text-muted hover:text-error hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            title="Delete user"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-13">
              <span className="text-text-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => fetchUsers(page - 1)}
                  className="p-1.5 rounded bg-surface-hover border border-border text-text-muted hover:text-text disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchUsers(page + 1)}
                  className="p-1.5 rounded bg-surface-hover border border-border text-text-muted hover:text-text disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 bg-surface border-border space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-error">
                <AlertTriangle size={24} />
                <h3 className="text-18 font-bold text-text">Confirm Deletion</h3>
              </div>
              <p className="text-14 text-text-muted leading-relaxed">
                Are you sure you want to delete <strong className="text-text">{deleteTarget.name}</strong> ({deleteTarget.email})? This user will be deactivated and soft-deleted.
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-error hover:bg-red-700 text-white font-medium text-14 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
