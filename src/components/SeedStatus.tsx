import { useQuery } from '@tanstack/react-query';
import { fetchSeedStatusCounts } from '@/shared/lib/api';

export default function SeedStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['seed-status'],
    queryFn: fetchSeedStatusCounts,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Checking seed status…</span>;
  }

  if (error) {
    return <span className="text-xs text-destructive">Seed status error</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Seed:</span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
        Providers: <strong>{data?.providers}</strong>
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
        Reqs: <strong>{data?.requirements}</strong>
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
        Anchors: <strong>{data?.anchors}</strong>
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
        Rules: <strong>{data?.rules}</strong>
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
        Exclusions: <strong>{data?.exclusions}</strong>
      </span>
    </div>
  );
}
