import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, BookOpen, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SkillGapsEmptyState() {
  return (
    <Card className="text-center py-8" data-testid="skill-gaps-empty">
      <CardHeader>
        <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
          <Target className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">No Skill Gaps Detected</CardTitle>
        <p className="text-muted-foreground mt-2">
          No skill gaps detected yet. Set a target role or start a quick win to get tailored gaps.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Link to="/plan?tab=goals">
              <Target className="h-4 w-4" />
              <span className="text-sm">Set Career Goals</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Link to="/discover?tab=skills">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Explore Skills</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}