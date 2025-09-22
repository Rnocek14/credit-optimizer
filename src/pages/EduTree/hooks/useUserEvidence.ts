import * as React from "react";
import { useQuery } from "@tanstack/react-query";

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
};

type EvidenceSets = {
  completed: Set<string>;
  inProgress: Set<string>;
  transferPending: Set<string>;
};

// You can change this to use the active userId from your auth context.
export function useUserEvidence(userId: string | "me" = "me") {
  const { data } = useQuery({
    queryKey: ["student-evidence", userId],
    queryFn: async () => {
      const res = await fetch(`/api/evidence/summary?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to load evidence summary");
      const json = (await res.json()) as EvidenceSummary;
      return json;
    },
    staleTime: 60_000,
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