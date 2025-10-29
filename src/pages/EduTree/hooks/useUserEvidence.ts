import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedData } from "@/contexts/UnifiedDataContext";
import { warnOnce } from "@/utils/warnOnce";
import { EVIDENCE_VERSION } from "@/config/versions";

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
  
  // Phase 1d: Prior degrees for career pivot (stub - not used until v5_pivot_mode)
  priorDegrees?: Array<{
    degreeName: string;
    institution: string;
    major: string;
    graduationYear: number;
    totalCredits: number;
  }>;
};

type EvidenceSets = {
  completed: Set<string>;
  inProgress: Set<string>;
  transferPending: Set<string>;
};

export function useUserEvidence(options?: { enabled?: boolean }) {
  const { state } = useUnifiedData();
  const user = state?.user;
  
  // Check if we have a valid Supabase session (not just a user object)
  const [hasSession, setHasSession] = React.useState(false);
  
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();
  }, [user?.id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-evidence', EVIDENCE_VERSION, user?.id ?? 'anon'],
    enabled: (options?.enabled ?? false) && !!user?.id && hasSession, // ✅ Requires real auth session
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('evidence-summary');

      if (error) {
        // Treat 400 as "no evidence data" (quiet, non-blocking)
        if (error.message?.includes('400') || error.status === 400) {
          console.warn('[Evidence] 400 from evidence-summary → returning null (no data)');
          return { completed: [], inProgress: [], transferPending: [] } as EvidenceSummary;
        }
        warnOnce('evidence-400', '[Evidence] summary failed once:', { status: error.status, message: error.message });
        return { completed: [], inProgress: [], transferPending: [] } as EvidenceSummary; // graceful fallback
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
    isLoading,
    error
  };
}