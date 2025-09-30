import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";

export type EvidenceSummary = {
  // catalog course ids the student has completed / is in-progress / pending transfer
  completed: string[];
  inProgress: string[];
  transferPending: string[];

  // optional: precomputed block coverage if your API provides it
  byBlock?: Record<
    string,
    { earnedCredits: number; neededCredits?: number | null; complete: boolean }
  >;
  
  // timestamp when evidence was calculated
  asOf?: string;
};

type EvidenceSets = {
  completed: Set<string>;
  inProgress: Set<string>;
  transferPending: Set<string>;
};

export function useUserEvidence() {
  const { state } = useUnifiedData();
  const user = state?.user;

  const { data } = useQuery({
    queryKey: ['student-evidence', user?.id ?? 'anon'],
    enabled: !!user?.id,          // ❗️no calls when unauthenticated
    retry: false,                 // ❗️no retry loops on 400s
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('evidence-summary', {
        body: { userId: user!.id }, // include if your function expects it
      });

      if (error) {
        const warned: Set<string> = (window as any).__evidenceWarned ?? new Set();
        if (!warned.has('evidence-400')) {
          console.warn('[Evidence] summary failed once:', { status: error.status, message: error.message });
          warned.add('evidence-400');
          (window as any).__evidenceWarned = warned;
        }
        return null as unknown as EvidenceSummary; // graceful fallback
      }
      return data as EvidenceSummary;
    },
  });

  const sets = React.useMemo<EvidenceSets>(() => {
    return {
      completed: new Set(data?.completed ?? []),
      inProgress: new Set(data?.inProgress ?? []),
      transferPending: new Set(data?.transferPending ?? []),
    };
  }, [data]);

  const getCourseStatus = React.useCallback(
    (catalogCourseId: string) => {
      if (sets.completed.has(catalogCourseId)) return "completed" as const;
      if (sets.inProgress.has(catalogCourseId)) return "in-progress" as const;
      if (sets.transferPending.has(catalogCourseId)) return "pending" as const;
      return "none" as const;
    },
    [sets]
  );

  return {
    raw: data,
    sets,
    getCourseStatus,
  };
}