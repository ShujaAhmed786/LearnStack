import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  rootTo?: string;
  rootLabel?: string;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  rootTo = '/dashboard',
  rootLabel = 'Home',
  className = '',
}) => {
  return (
    <nav className={`flex items-center gap-2 text-13 text-text-muted mb-6 flex-wrap ${className}`}>
      {rootTo && (
        <Link
          to={rootTo}
          className="flex items-center gap-1.5 hover:text-primary transition-colors font-medium"
        >
          <Home size={15} />
          <span>{rootLabel}</span>
        </Link>
      )}

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <React.Fragment key={idx}>
            <ChevronRight size={13} className="shrink-0 text-text-muted/40" />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-primary transition-colors max-w-xs truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`max-w-xs truncate ${isLast ? 'text-text font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
