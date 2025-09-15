import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallbackMode?: 'safe' | 'empty' | 'redirect';
  onFallbackToNormal?: () => void;
  onReload?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class CalmErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Calm Mode Error Boundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });

    // Show user-friendly error notification
    toast.error('Calm mode encountered an error', {
      description: 'Switching to safe mode. Check console for details.'
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleFallbackToNormal = () => {
    if (this.props.onFallbackToNormal) {
      this.props.onFallbackToNormal();
    } else {
      // Fallback to removing calm mode from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('st_calm');
      window.history.replaceState({}, '', url.toString());
      window.location.reload();
    }
  };

  handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallbackMode = 'safe' } = this.props;
    const { error, errorInfo } = this.state;

    if (fallbackMode === 'empty') {
      return (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <p>Calm mode is temporarily unavailable</p>
            <Button onClick={this.handleFallbackToNormal} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Normal View
            </Button>
          </div>
        </div>
      );
    }

    if (fallbackMode === 'redirect') {
      // Automatically redirect after a brief moment
      setTimeout(this.handleFallbackToNormal, 1000);
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Calm mode failed to load</p>
            <p className="text-sm text-muted-foreground">Switching to normal view...</p>
          </div>
        </div>
      );
    }

    // Default 'safe' mode
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
              The calm skill tree view encountered an error and cannot be displayed properly.
            </p>
            
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
          
          {import.meta.env.DEV && error && (
            <details className="text-xs bg-muted p-3 rounded border">
              <summary className="cursor-pointer font-medium mb-2">
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
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    );
  }
}