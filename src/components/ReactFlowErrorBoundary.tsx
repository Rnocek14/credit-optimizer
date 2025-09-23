import React, { Component, ErrorInfo, ReactNode, useCallback } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

/**
 * Enhanced error boundary for React Flow with interaction recovery
 * Helps recover from edge rendering errors that break pan/zoom
 */
export class ReactFlowErrorBoundary extends Component<Props, State> {
  private resetTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ReactFlowErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Increment error count for recovery logic
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));

    // Auto-recovery attempt for React Flow interaction issues
    if (error.message?.includes('React Flow') || error.stack?.includes('react-flow')) {
      console.log('[ReactFlowErrorBoundary] React Flow error detected, attempting recovery...');
      this.attemptReactFlowRecovery();
    }
  }

  attemptReactFlowRecovery = () => {
    // Clear any existing timeout
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }

    // Attempt to reset React Flow's internal state
    this.resetTimeout = setTimeout(() => {
      console.log('[ReactFlowErrorBoundary] Attempting React Flow reset...');
      
      // Force React Flow to reinitialize by clearing its internal state
      const reactFlowInstance = (window as any).__reactFlowInstance__;
      if (reactFlowInstance) {
        try {
          reactFlowInstance.fitView();
        } catch (e) {
          console.warn('[ReactFlowErrorBoundary] fitView failed during recovery:', e);
        }
      }

      // Reset error boundary state
      this.setState({ hasError: false, error: undefined });
    }, 100);
  };

  componentWillUnmount() {
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      const isRepeatedError = this.state.errorCount > 2;
      
      return (
        <div className="flex items-center justify-center h-full bg-background border border-border rounded">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold mb-2">Graph Display Error</h3>
            <p className="text-muted-foreground mb-4">
              {isRepeatedError 
                ? "Multiple errors detected. This may indicate a data or configuration issue."
                : "The graph encountered a rendering issue. This is usually temporary."
              }
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              {isRepeatedError && (
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined, errorCount: 0 });
                    window.location.reload();
                  }}
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90 transition-colors"
                >
                  Full Reload
                </button>
              )}
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer">Error Details (Dev)</summary>
                <pre className="mt-2 p-2 bg-muted text-xs rounded overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to provide React Flow reset capabilities
 */
export function useReactFlowRecovery() {
  return useCallback(() => {
    console.log('[ReactFlowRecovery] Manual recovery triggered');
    
    // Store reference to React Flow instance for recovery
    const reactFlowWrapper = document.querySelector('.react-flow');
    if (reactFlowWrapper) {
      // Force re-render by toggling a data attribute
      const current = reactFlowWrapper.getAttribute('data-recovery') || '0';
      reactFlowWrapper.setAttribute('data-recovery', String(parseInt(current) + 1));
    }
    
    // Trigger fitView after a brief delay
    setTimeout(() => {
      const reactFlowInstance = (window as any).__reactFlowInstance__;
      if (reactFlowInstance?.fitView) {
        try {
          reactFlowInstance.fitView();
        } catch (e) {
          console.warn('[ReactFlowRecovery] fitView failed:', e);
        }
      }
    }, 50);
  }, []);
}