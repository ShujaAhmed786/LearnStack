import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  CheckSquare,
  BookOpen,
  BookText,
  Zap,
  Settings,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/content', label: 'Content Tree', icon: FolderTree },
    { to: '/admin/quizzes', label: 'Quizzes', icon: CheckSquare },
    { to: '/admin/guides', label: 'Practice Guides', icon: BookText },
    { to: '/admin/tactics', label: 'Tactics Library', icon: Zap },
    { to: '/admin/settings', label: 'Org Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg text-text flex transition-colors">
      {/* Admin Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 border-r border-border bg-surface shrink-0 flex-col h-screen sticky top-0 transition-colors">
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="overflow-hidden">
              <span className="font-heading font-bold text-14 text-text block truncate">
                {org?.name || 'LearnStack'}
              </span>
              <span className="text-11 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-13 font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Switch to learner app & footer */}
        <div className="p-3 border-t border-border space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-12 text-text-muted hover:text-text transition-colors border border-border"
          >
            <span className="flex items-center gap-2">
              <ExternalLink size={14} /> Learner App
            </span>
            <span className="text-11 text-primary font-medium">Exit Admin</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-surface border-r border-border h-full shadow-2xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-primary" />
                <span className="font-heading font-bold text-14 text-text">Admin Console</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded text-text-muted hover:text-text"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-13 font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-muted hover:bg-surface-hover hover:text-text'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="pt-3 border-t border-border">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover text-12 text-text"
              >
                <span>Learner App</span>
                <ExternalLink size={14} className="text-primary" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover mr-1"
            >
              <Menu size={20} />
            </button>
            <span className="text-14 text-text-muted hidden sm:inline">Organization:</span>
            <span className="text-14 font-semibold text-text flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: org?.primaryColor || '#14B8A6' }}
              />
              {org?.name || 'LearnStack'}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />

            <div className="flex items-center gap-2">
              <span className="text-13 text-text font-medium hidden sm:inline">{user?.name}</span>
              <span className="text-11 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-medium">
                {user?.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-surface-hover transition-colors"
              title="Logout from Admin"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
