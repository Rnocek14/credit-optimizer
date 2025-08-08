import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCareerReadiness } from "@/hooks/useCareerReadiness";
import { supabase } from "@/integrations/supabase/client";

interface CRIROIPanelProps { userId?: string | null }

export function CRIROIPanel({ userId }: CRIROIPanelProps) {
  const { criScore, isLoading: criLoading } = useCareerReadiness({ userId: userId || undefined } as any);
  const [locations, setLocations] = useState<{ location: string; roi: number; lqi?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('career_location_multipliers')
          .select('*, locations(name)')
          .limit(3);
        if (!mounted) return;
        if (data && data.length) {
          setLocations(
            data.map((r: any) => ({ location: r.locations?.name || 'United States', roi: Math.round((r.salary_multiplier || 1) * 100), lqi: Math.round((r.demand_multiplier || 1) * 100) }))
          );
        } else {
          setLocations([
            { location: 'San Francisco, CA', roi: 127, lqi: 118 },
            { location: 'New York, NY', roi: 121, lqi: 112 },
            { location: 'Austin, TX', roi: 105, lqi: 103 },
          ]);
        }
      } catch {
        setLocations([
          { location: 'San Francisco, CA', roi: 127, lqi: 118 },
          { location: 'New York, NY', roi: 121, lqi: 112 },
          { location: 'Austin, TX', roi: 105, lqi: 103 },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, []);

  const top = useMemo(() => locations.slice(0, 3), [locations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRI & ROI by Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <div className="text-sm">Your CRI: <span className="font-semibold">{Math.round(criScore || 72)}</span></div>
        )}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <ul className="space-y-2">
            {top.map((l) => (
              <li key={l.location} className="flex items-center justify-between text-sm">
                <span>{l.location}</span>
                <span className="text-muted-foreground">ROI {l.roi}% • LQI {l.lqi ?? 100}%</span>
              </li>
            ))}
          </ul>
        )}
        <a href="/salary-insights" className="text-primary text-sm">Open salary insights →</a>
      </CardContent>
    </Card>
  );
}
