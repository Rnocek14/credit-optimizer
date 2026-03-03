import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, DollarSign, Clock, RefreshCw } from "lucide-react";

const SecureLandingPage = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-10 text-center">
        {/* Hero */}
        <div className="space-y-5">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Plan the smartest path to your degree
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed">
            Compare accredited programs, maximize transfer credits, and optimize for cost and time — all in one planner.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Transfer optimization</p>
              <p className="text-xs text-muted-foreground">Maximize credits from prior learning</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Cost comparison</p>
              <p className="text-xs text-muted-foreground">Find the most affordable path</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Fastest completion</p>
              <p className="text-xs text-muted-foreground">Graduate on your timeline</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-2">
          <Button asChild size="lg" className="w-full text-base">
            <Link to="/auth">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground">
            Free to explore. No credit card required.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="pt-4 border-t border-border">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dev-login">Development Login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureLandingPage;
