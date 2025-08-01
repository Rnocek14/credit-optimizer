import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class LearningPathErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Learning Path Visualization Error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 m-4">
          <Alert variant="destructive">
            <AlertTitle>Visualization Error</AlertTitle>
            <AlertDescription className="mt-2">
              There was an error rendering the learning path visualization. This could be due to:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Missing or malformed learning path data</li>
                <li>Node type mapping issues</li>
                <li>Layout algorithm problems</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 space-y-3">
            <Button onClick={this.handleRetry} variant="outline">
              Try Again
            </Button>
            
            {this.state.error && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <div className="mt-2 p-3 bg-muted rounded-md font-mono text-xs">
                  <div>Error: {this.state.error.message}</div>
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      Stack: {this.state.errorInfo}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}