import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft, Bug } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDebugInfo?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  errorId: string;
}

export class CalmModeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: `calm-error-${Date.now()}`
    };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 Calm Mode Error Boundary: Error caught', error);
    return { 
      hasError: true, 
      error,
      errorId: `calm-error-${Date.now()}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A'
    };

    console.group('🚨 Calm Mode Error Details');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Full Details:', errorDetails);
    console.groupEnd();
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });

    // Call external error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show user-friendly notification
    toast.error('Calm mode encountered an error', {
      description: `Error ID: ${this.state.errorId}. Check console for details.`,
      duration: 5000,
    });

    // Store error for debugging
    if (typeof window !== 'undefined') {
      try {
        const errors = JSON.parse(localStorage.getItem('calmModeErrors') || '[]');
        errors.push({
          ...errorDetails,
          errorId: this.state.errorId
        });
        // Keep only last 5 errors
        if (errors.length > 5) errors.shift();
        localStorage.setItem('calmModeErrors', JSON.stringify(errors));
      } catch (e) {
        console.warn('Failed to store error in localStorage', e);
      }
    }
  }

  handleRetry = () => {
    console.log('🔄 Calm Mode: Retrying after error');
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: `calm-error-${Date.now()}`
    });
  };

  handleFallbackToNormal = () => {
    console.log('🔄 Calm Mode: Falling back to normal mode');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('st_calm');
      window.history.replaceState({}, '', url.toString());
      window.location.reload();
    }
  };

  handleReload = () => {
    console.log('🔄 Calm Mode: Reloading page');
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;
    const { fallbackMessage = "Calm mode encountered an error and cannot be displayed", showDebugInfo = true } = this.props;

    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Calm Mode Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {fallbackMessage}
            </p>
            
            <div className="bg-muted/50 p-3 rounded text-xs">
              <div className="font-medium">Error ID: {this.state.errorId}</div>
              <div className="text-muted-foreground">
                This error has been logged for debugging. You can continue using the normal view.
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={this.handleRetry} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button onClick={this.handleFallbackToNormal} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Switch to Normal View
              </Button>
              
              <Button onClick={this.handleReload} variant="outline" size="sm">
                Reload Page
              </Button>
            </div>
          </div>
          
          {showDebugInfo && import.meta.env.DEV && error && (
            <details className="text-xs bg-muted p-3 rounded border">
              <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Error Details (Development)
              </summary>
              <div className="space-y-2">
                <div>
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 overflow-auto max-h-32 text-xs bg-background p-2 rounded">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 overflow-auto max-h-32 text-xs bg-background p-2 rounded">
                      {errorInfo}
                    </pre>
                  </div>
                )}
                <div>
                  <strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date().toISOString()}
                </div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    );
  }
}
