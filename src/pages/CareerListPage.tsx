import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCareerPaths } from '@/hooks/useCareerPaths';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function CareerListPage() {
  const { data: careers, isLoading, error } = useCareerPaths();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!careers) return [];
    if (!search.trim()) return careers;

    const q = search.toLowerCase();
    return careers.filter((c) => {
      const title = c.title?.toLowerCase() ?? '';
      const industry = c.industry?.toLowerCase() ?? '';
      const summary = c.summary?.toLowerCase() ?? '';
      return (
        title.includes(q) ||
        industry.includes(q) ||
        summary.includes(q)
      );
    });
  }, [careers, search]);

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading careers…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-lg font-semibold">Explore Careers</h1>
        <p className="text-sm text-destructive">
          Unable to load careers: {(error as any).message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Explore Careers</h1>
        <p className="text-sm text-muted-foreground">
          Browse high-impact career paths and see which degrees support each journey.
        </p>
        <div className="max-w-md">
          <Input
            placeholder="Search careers (e.g. software, data, security)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No careers match your search yet. Try another keyword.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((career) => (
            <Card
              key={career.id}
              className="flex flex-col justify-between p-4 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold leading-snug">
                      {career.title}
                    </h2>
                    {career.industry && (
                      <p className="text-xs text-muted-foreground">
                        {career.industry}
                      </p>
                    )}
                  </div>
                </div>
                {career.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {career.summary}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  Avg salary:{' '}
                  <span className="font-medium">
                    {career.average_salary
                      ? `$${career.average_salary.toLocaleString()}`
                      : '—'}
                  </span>
                </div>

                <Link to={`/explore/careers/${career.id}`}>
                  <Button size="sm" variant="outline">
                    View details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
