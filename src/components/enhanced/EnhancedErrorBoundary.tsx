import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportError } from '@/lib/reportError';

interface Props {
  children: ReactNode;
  /** Optional name for error reporting context */
  name?: string;
  /** Static fallback UI, or render function receiving error + retry */
  fallback?: ReactNode | ((props: { error: Error; retry: () => void }) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** When any value in this array changes, the boundary resets automatically */
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Canonical error boundary for the entire application.
 * 
 * Usage:
 *   <EnhancedErrorBoundary name="marketplace">
 *     <MarketplacePage />
 *   </EnhancedErrorBoundary>
 * 
 *   <EnhancedErrorBoundary 
 *     name="canvas" 
 *     resetKeys={[nodes.length]}
 *     fallback={({ error, retry }) => <MyFallback error={error} onRetry={retry} />}
 *   >
 *     <Canvas />
 *   </EnhancedErrorBoundary>
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Centralized error reporting
    reportError(error, {
      name: this.props.name,
      componentStack: errorInfo.componentStack || undefined,
    });

    this.props.onError?.(error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    // Auto-reset when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, idx) => prevProps.resetKeys?.[idx] !== key
      );
      if (keysChanged) {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const error = this.state.error!;

      // Render-function fallback
      if (typeof fallback === 'function') {
        return fallback({ error, retry: this.handleRetry });
      }

      // Static ReactNode fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An error occurred while loading this component. This might be a temporary issue.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="bg-muted/50 p-3 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 overflow-auto">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={this.handleRetry}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/** HOC wrapper for convenience */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedErrorBoundary fallback={fallback}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}
