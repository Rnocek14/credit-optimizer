import { useCareerPaths } from '@/hooks/useCareerPaths';
import { useCareerPathPrograms } from '@/hooks/useCareerPathPrograms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function CareerTestPanel() {
  const { data: careers, isLoading, error } = useCareerPaths();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Career Data Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Career Data Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">Error: {error.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Run the seed_career_data.sql migration to create test data.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!careers || careers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Career Data Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No careers found in database.
          </p>
          <div className="text-xs">
            <p className="font-semibold mb-1">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open Supabase SQL Editor</li>
              <li>Run <code className="bg-muted px-1 rounded">scripts/migrations/seed_career_data.sql</code></li>
              <li>Run <code className="bg-muted px-1 rounded">scripts/migrations/create_career_path_programs.sql</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Career Data Status
          <Badge variant="secondary">{careers.length} careers</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {careers.map((career) => (
          <CareerMappingStatus key={career.id} careerPathId={career.id} careerTitle={career.title} />
        ))}
        <div className="pt-2 border-t">
          <Button asChild size="sm" className="w-full">
            <Link to="/explore/careers">
              View Career List Page
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CareerMappingStatus({ careerPathId, careerTitle }: { careerPathId: string; careerTitle: string }) {
  const { data: mappings, isLoading } = useCareerPathPrograms(careerPathId);

  if (isLoading) {
    return (
      <div className="text-xs">
        <span className="font-medium">{careerTitle}</span>: Loading...
      </div>
    );
  }

  const count = mappings?.length || 0;

  return (
    <div className="flex items-center justify-between text-xs">
      <div>
        <span className="font-medium">{careerTitle}</span>
        <span className="text-muted-foreground ml-2">
          {count} program{count !== 1 ? 's' : ''}
        </span>
      </div>
      {count > 0 ? (
        <Button asChild size="sm" variant="outline" className="h-6 text-xs">
          <Link to={`/explore/careers/${careerPathId}`}>
            View
          </Link>
        </Button>
      ) : (
        <Badge variant="outline" className="text-xs">No mappings</Badge>
      )}
    </div>
  );
}
