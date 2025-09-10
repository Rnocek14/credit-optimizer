import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class EduTreeErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 EduTree Error Boundary caught error:', error);
    console.error('📊 Component stack:', errorInfo.componentStack);
    
    // Log to analytics or error tracking service
    this.logError(error, errorInfo);
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    // In a real app, send to error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };
    
    console.error('🚨 EduTree Error Log:', errorData);
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Retry attempt ${this.retryCount}/${this.maxRetries}`);
      
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      toast({
        title: "Retrying...",
        description: `Attempt ${this.retryCount} of ${this.maxRetries}`,
      });
    } else {
      toast({
        title: "Max retries reached",
        description: "Please refresh the page or contact support",
        variant: "destructive",
      });
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRefreshPage = () => {
    window.location.reload();
  };

  private handleReportBug = () => {
    const errorData = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      url: window.location.href,
    };
    
    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
    
    toast({
      title: "Error details copied",
      description: "Please paste this information when reporting the bug",
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[600px] flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Education Tree Error</CardTitle>
              <CardDescription>
                Something went wrong while loading the education tree. This could be due to a data loading issue or rendering problem.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                  <div className="font-semibold mb-2">Development Error Details:</div>
                  <div className="space-y-1">
                    <div><strong>Error:</strong> {this.state.error.message}</div>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold">Stack Trace</summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap bg-background p-2 rounded border">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  className="flex-1"
                  disabled={this.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.retryCount >= this.maxRetries ? 'Max Retries Reached' : `Try Again (${this.retryCount}/${this.maxRetries})`}
                </Button>
                
                <Button onClick={this.handleRefreshPage} variant="default" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="secondary" className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              {/* Report bug button */}
              <div className="pt-2 border-t">
                <Button 
                  onClick={this.handleReportBug} 
                  variant="ghost" 
                  size="sm"
                  className="w-full"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Copy Error Details for Support
                </Button>
              </div>
              
              {/* Helpful tips */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <div className="font-semibold mb-1">Troubleshooting tips:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Check your internet connection</li>
                  <li>• Clear browser cache and cookies</li>
                  <li>• Try a different browser or incognito mode</li>
                  <li>• Disable browser extensions temporarily</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}