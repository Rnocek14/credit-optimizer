import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SeedStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['seed-status'],
    queryFn: async () => {
      const [reqs, anchors, rules, exclusions] = await Promise.all([
        supabase.from('requirement_catalog' as any).select('*', { count: 'exact', head: true }),
        supabase.from('partner_policies' as any).select('*', { count: 'exact', head: true }),
        supabase.from('credit_transfer_rules' as any).select('*', { count: 'exact', head: true }),
        supabase.from('option_exclusions' as any).select('*', { count: 'exact', head: true }),
      ]);

      return {
        requirements: reqs.count ?? 0,
        anchors: anchors.count ?? 0,
        rules: rules.count ?? 0,
        exclusions: exclusions.count ?? 0,
      };
    },
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
