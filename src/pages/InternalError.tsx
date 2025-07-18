import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Target } from "lucide-react";

export default function InternalError() {
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();

  const handleRetry = () => {
    setIsRetrying(true);
    // Reload the page to retry
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRetry} 
                className="w-full" 
                variant="gradient"
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleGoBack} variant="outline" size="sm">
                  Go Back
                </Button>
                
                <Button asChild variant="outline" size="sm">
                  <Link to="/">
                    <Home className="mr-1 h-3 w-3" />
                    Home
                  </Link>
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Link to="/" className="inline-flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/60 rounded-md flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  PathfindAI
                </span>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}