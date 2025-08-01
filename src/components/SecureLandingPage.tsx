import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Lock, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const SecureLandingPage = () => {
  useEffect(() => {
    // Log unauthorized access attempts
    console.log('[Security] Unauthorized access attempt to home page', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Secure Access Required
          </h1>
          
          <p className="text-muted-foreground">
            This platform requires authentication to access career development tools and resources.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Button asChild size="lg" className="w-full">
            <Link to="/auth">
              <Lock className="mr-2 h-4 w-4" />
              Sign In to Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <p className="text-xs text-muted-foreground">
            New users will be guided through a secure registration process.
          </p>
        </div>

        <div className="pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            For support or access issues, contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureLandingPage;