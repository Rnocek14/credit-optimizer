import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ArrowRight, Target, BookOpen, Users, Search } from "lucide-react";

interface MayaInlinePanelProps {
  context: 'discover' | 'plan' | 'progress' | 'contribute';
}

const contextConfig = {
  discover: {
    icon: Search,
    title: "Maya's Discovery Guidance",
    tip: "Start by exploring career paths that match your interests. Use the filters to narrow down options based on salary, growth potential, and skills you already have.",
    action: "Find Your Path",
    actionHref: "/discover?tab=career"
  },
  plan: {
    icon: Target,
    title: "Maya's Planning Guidance", 
    tip: "Break down your career goals into actionable steps. Focus on building one skill at a time and setting realistic milestones.",
    action: "Take Next Step",
    actionHref: "/plan?tab=roadmap"
  },
  progress: {
    icon: BookOpen,
    title: "Maya's Progress Guidance",
    tip: "Document your achievements and showcase your growing skills. Regular reflection helps you see how far you've come.",
    action: "Add to Resume",
    actionHref: "/progress?tab=resume"
  },
  contribute: {
    icon: Users,
    title: "Maya's Contribution Guidance",
    tip: "Share your knowledge to help others while strengthening your own skills. Teaching is one of the best ways to learn.",
    action: "Start Contributing",
    actionHref: "/contribute?tab=teach"
  }
};

export default function MayaInlinePanel({ context }: MayaInlinePanelProps) {
  const config = contextConfig[context];
  const Icon = config.icon;

  return (
    <Card 
      className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20" 
      data-testid={`maya-panel-${context}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.tip}
          </p>
        </div>
        <Button 
          asChild 
          size="sm" 
          className="w-full"
          data-testid={`cta-${context.replace('_', '-')}`}
        >
          <a href={config.actionHref}>
            {config.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}