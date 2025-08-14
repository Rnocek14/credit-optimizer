import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Users, BookOpen, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RecommendationEmptyState() {
  return (
    <Card className="text-center py-12">
      <CardHeader>
        <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
          <Target className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>No Recommendations Yet</CardTitle>
        <p className="text-muted-foreground mt-2">
          Get personalized recommendations by setting up your career goals and exploring your interests.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Link to="/plan?tab=goals">
              <Target className="h-5 w-5" />
              <span className="text-sm">Set Career Goals</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Link to="/discover?tab=mentors">
              <Users className="h-5 w-5" />
              <span className="text-sm">Connect with Mentors</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Link to="/discover?tab=skills">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">Explore Skills</span>
            </Link>
          </Button>
        </div>
        
        <div className="pt-4 border-t">
          <Button asChild size="lg">
            <Link to="/discover">
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Exploring
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}