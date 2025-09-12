import React, { Component, ReactNode } from 'react';
import { EduTreeError } from '@/components/EduTreeError';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class EduTreeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to help with debugging
    if (process.env.NODE_ENV !== "production") {
      console.error('[EduTree] Error caught by boundary:', error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset component state without full page reload to avoid reload loops
    this.setState({ hasError: false, error: undefined });
    
    // Clear any query caches to ensure fresh data on retry
    if (typeof window !== 'undefined' && window.location.search.includes('refresh=')) {
      // Remove refresh param to prevent reload loops
      const url = new URL(window.location.href);
      url.searchParams.delete('refresh');
      window.history.replaceState(null, '', url.toString());
    }
    
    // Add a small delay to allow component state to stabilize
    setTimeout(() => {
      // Force re-render by updating the key or triggering React Query refetch
      if (process.env.NODE_ENV !== "production") {
        console.log('[EduTreeErrorBoundary] Retrying after error - state reset');
      }
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      return <EduTreeError error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}