import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { LogOut, User as UserIcon, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, description, actions }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-b border-border bg-surface px-6 py-4 sticky top-0 z-30 transition-colors">
      <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {title ? (
          <div>
            <h1 className="text-24 font-bold text-text tracking-tight">{title}</h1>
            {description && (
              <p className="text-14 text-text-muted mt-0.5">{description}</p>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3 sm:gap-4 self-end md:self-auto w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          {/* Global Search Bar */}
          {user && (
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-lg pl-9 pr-3 py-1.5 text-14 text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </form>
          )}

          {actions}

          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-primary">
                  <UserIcon size={16} />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-14 font-medium text-text leading-tight">{user.name}</div>
                  <div className="text-11 text-text-muted capitalize">{user.role.toLowerCase()}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-text-muted hover:text-danger hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
