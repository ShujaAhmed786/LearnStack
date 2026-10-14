import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors anywhere in the route tree and shows a friendly
 * fallback instead of a blank screen. Users can reload to recover.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logged for debugging; details are not shown to the user.
    console.error('ErrorBoundary caught a render error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="text-center max-w-md w-full bg-surface rounded-xl border border-border p-8">
            <h2 className="text-20 font-bold text-text mb-2">Something went wrong</h2>
            <p className="text-14 text-text-muted mb-6">
              This page ran into an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-[#0A1628] font-medium text-14 hover:opacity-90 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
