import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ProductionErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ProductionErrorBoundary extends React.Component<
  ProductionErrorBoundaryProps,
  ProductionErrorBoundaryState
> {
  constructor(props: ProductionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProductionErrorBoundaryState> {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Production Error Boundary caught an error:', error, errorInfo);
    }

    // Report error to monitoring service
    this.reportError(error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('supabase.auth.token') ? 'authenticated' : 'anonymous'
    };

    // In a real production app, you would send this to your error monitoring service
    console.error('Error Report:', errorReport);
    
    // Store in localStorage for debugging
    try {
      const errorHistory = JSON.parse(localStorage.getItem('error_history') || '[]');
      errorHistory.push(errorReport);
      // Keep only last 10 errors
      if (errorHistory.length > 10) {
        errorHistory.shift();
      }
      localStorage.setItem('error_history', JSON.stringify(errorHistory));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default production error UI
      return <ProductionErrorFallback 
        error={this.state.error} 
        errorId={this.state.errorId}
        onRetry={this.handleRetry} 
      />;
    }

    return this.props.children;
  }
}

interface ProductionErrorFallbackProps {
  error: Error;
  errorId: string;
  onRetry: () => void;
}

function ProductionErrorFallback({ error, errorId, onRetry }: ProductionErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') || 
                        error.message.includes('timeout');

  const isAuthError = error.message.includes('auth') || 
                     error.message.includes('unauthorized') ||
                     error.message.includes('permission');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {isNetworkError && (
                <span>Network connection issue. Please check your internet connection and try again.</span>
              )}
              {isAuthError && (
                <span>Authentication required. Please log in to continue.</span>
              )}
              {!isNetworkError && !isAuthError && (
                <span>An unexpected error occurred. Our team has been notified.</span>
              )}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <strong>Error ID:</strong> {errorId}
          </div>

          {import.meta.env.DEV && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Technical Details (Dev Only)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            If this problem persists, please contact support with the error ID above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
