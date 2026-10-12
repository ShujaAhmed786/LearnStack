import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, description, actions }) => {
  return (
    <div className="flex min-h-screen bg-bg transition-colors">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-y-auto min-w-0">
        {title ? (
          <>
            <Header title={title} description={description} actions={actions} />
            <div className="max-w-content mx-auto p-4 sm:p-6 w-full flex-1">
              {children}
            </div>
          </>
        ) : (
          <div className="max-w-content mx-auto p-4 sm:p-6 w-full flex-1">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
