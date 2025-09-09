import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundaryWithDetails extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`❌ Error in ${this.props.name || 'ErrorBoundary'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-2xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Component Error in {this.props.name || 'Unknown Component'}
            </h3>
            <div className="text-sm text-muted-foreground mb-4 text-left">
              <strong>Error:</strong> {this.state.error?.message}
              {import.meta.env.DEV && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Stack trace (dev only)</summary>
                  <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
            <Button 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}