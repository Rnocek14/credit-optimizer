import { Link } from 'react-router-dom';
import { useCareerPaths } from '@/hooks/useCareerPaths';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';

export function CareerListPage() {
  const { data: careers, isLoading, error } = useCareerPaths();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!careers) return [];
    if (!search.trim()) return careers;
    const q = search.toLowerCase();
    return careers.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.industry ?? '').toLowerCase().includes(q) ||
        (c.summary ?? '').toLowerCase().includes(q)
    );
  }, [careers, search]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-7 w-40 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
        <div className="h-40 w-full bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="font-semibold text-destructive">
          Unable to load careers.
        </div>
        <div className="text-sm text-muted-foreground">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Explore Careers</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Browse high-impact career paths and see which degree programs best
            support each journey.
          </p>
        </div>
        <Input
          placeholder="Search careers by title, industry..."
          className="w-full sm:w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No careers match your search yet. Try another keyword.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((career) => (
            <Card key={career.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3 space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  {career.title}
                  {career.industry && (
                    <Badge variant="outline" className="text-xs ml-1">
                      {career.industry}
                    </Badge>
                  )}
                </CardTitle>
                {career.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {career.summary}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0 pb-4 px-6">
                <div className="text-xs text-muted-foreground">
                  Avg salary:{' '}
                  <span className="font-medium text-foreground">
                    {career.average_salary
                      ? `$${career.average_salary.toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <Button asChild size="sm">
                  <Link to={`/explore/careers/${career.id}`}>
                    View details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
