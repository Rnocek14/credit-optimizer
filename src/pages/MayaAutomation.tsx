import React from "react";
import { Helmet } from "react-helmet-async";
import { MayaAutonomousIntelligence } from "@/components/MayaAutonomousIntelligence";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { LoadingState } from "@/components/LoadingState";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MayaAutomation() {
  return (
    <>
      <Helmet>
        <title>Maya Automation Dashboard - PathfindAI</title>
        <meta name="description" content="Advanced AI automation dashboard with transparent, controllable, and trackable Maya intelligence." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <UnifiedDataProvider>
            <ErrorBoundary>
              <MayaAutonomousIntelligence />
            </ErrorBoundary>
          </UnifiedDataProvider>
        </div>
      </div>
    </>
  );
}

// Error boundary component for production resilience
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Maya Automation Dashboard Error:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-md mx-auto mt-16">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Dashboard Error</h3>
                <p className="text-muted-foreground">
                  There was an issue loading the automation dashboard. Please try refreshing the page.
                </p>
              </div>
              <Button 
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}