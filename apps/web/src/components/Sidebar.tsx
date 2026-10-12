import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  FolderTree,
  HelpCircle,
  CheckSquare,
  BookText,
  Zap,
  Award,
  Video,
  MessageSquare,
  Menu,
  X,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar: React.FC = () => {
  const { org, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInstructorOrAdmin =
    user?.role === 'ORG_ADMIN' || user?.role === 'INSTRUCTOR' || user?.role === 'SUPER_ADMIN';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/discussions', label: 'Forums', icon: MessageSquare },
    { to: '/live', label: 'Live Classes', icon: Video },
    { to: '/certificates', label: 'Certificates', icon: Award },
    { to: '/practices', label: 'Practices', icon: BookText },
    { to: '/tactics', label: 'Tactics', icon: Zap },
    { to: '/browse', label: 'Browse', icon: Layers },
    { to: '/quizzes', label: 'Quizzes', icon: HelpCircle },
    ...(isInstructorOrAdmin
      ? [
          { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
          { to: '/admin/content', label: 'Content Admin', icon: FolderTree },
          { to: '/admin/quizzes', label: 'Quiz Admin', icon: CheckSquare },
        ]
      : []),
  ];

  // Primary items for mobile bottom bar
  const primaryMobileItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/quizzes', label: 'Quizzes', icon: HelpCircle },
    { to: '/practices', label: 'Practices', icon: BookText },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-surface shrink-0 h-screen sticky top-0 transition-colors">
        {/* Brand Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                <span className="font-heading text-18 font-bold">L</span>
              </div>
            )}
            <div className="overflow-hidden">
              <span className="font-heading font-bold text-16 text-text block truncate tracking-tight">
                {org?.name || 'LearnStack'}
              </span>
              <span className="text-12 text-text-muted block truncate font-mono">
                {org?.slug ? `@${org.slug}` : 'Academy'}
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-14 font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer brand info */}
        <div className="p-4 border-t border-border flex items-center justify-between text-12 text-text-muted">
          <span>LearnStack v1.0</span>
          {isInstructorOrAdmin && (
            <NavLink
              to="/admin"
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <span>Admin</span>
              <ExternalLink size={12} />
            </NavLink>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around py-2 px-2 shadow-lg">
        {primaryMobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-11 transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'text-text-muted hover:text-text'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-11 text-text-muted hover:text-text transition-colors"
          aria-label="Open full menu"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Full Navigation Drawer / Backdrop */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-4/5 max-w-xs bg-surface border-r border-border h-full shadow-2xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                  <span className="font-heading text-16 font-bold">L</span>
                </div>
                <span className="font-heading font-bold text-16 text-text">LearnStack</span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-14 font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-muted hover:bg-surface-hover hover:text-text'
                      }`
                    }
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {isInstructorOrAdmin && (
              <div className="pt-3 border-t border-border">
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover text-13 font-medium text-text border border-border"
                >
                  <span>Admin Console</span>
                  <ExternalLink size={14} className="text-primary" />
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
