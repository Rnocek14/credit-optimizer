import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;
    
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Skill Tree Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The skill tree encountered an error. This usually happens during layout calculation.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs bg-muted p-2 rounded">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button onClick={this.resetError} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('ST_FORCE_GRID', '1');
                    this.resetError();
                  }
                }}
              >
                Force Grid Layout
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}