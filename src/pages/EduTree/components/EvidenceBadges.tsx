import * as React from "react";
import { useUserEvidence } from "../hooks/useUserEvidence";

type Props = {
  userId?: string | "me";
  blockId: string;
  // If your API doesn't return byBlock yet, you can pass these as hints:
  creditsNeeded?: number | null;
  catalogCourseIds?: string[]; // optional; used for local coverage calc
};

export const EvidenceBadges: React.FC<Props> = ({
  userId = "me",
  blockId,
  creditsNeeded,
  catalogCourseIds,
}) => {
  const { raw, getCourseStatus } = useUserEvidence(userId);

  // Prefer server-side coverage if available; otherwise do a quick client calc.
  const coverage = React.useMemo(() => {
    const server = raw?.byBlock?.[blockId];
    if (server) return server;

    if (!catalogCourseIds?.length) {
      return { earnedCredits: 0, neededCredits: creditsNeeded ?? null, complete: false };
    }

    // Simple local calc: 3 credits per listed course (adjust if you have credits per course)
    const perCourseCredits = 3;
    let earned = 0;
    for (const id of catalogCourseIds) {
      const st = getCourseStatus(id);
      if (st === "completed") earned += perCourseCredits;
    }
    const needed = creditsNeeded ?? null;
    return { earnedCredits: earned, neededCredits: needed, complete: needed != null ? earned >= needed : false };
  }, [raw?.byBlock, blockId, catalogCourseIds, creditsNeeded, getCourseStatus]);

  // Node-level tiny badge strip
  const pills = React.useMemo(() => {
    if (!catalogCourseIds?.length) return null;
    let c = 0, ip = 0, p = 0;
    for (const id of catalogCourseIds) {
      const st = getCourseStatus(id);
      if (st === "completed") c++;
      else if (st === "in-progress") ip++;
      else if (st === "pending") p++;
    }
    return { c, ip, p };
  }, [catalogCourseIds, getCourseStatus]);

  return (
    <div className="evi--dock" aria-label="Student evidence">
      {/* progress ring / bar (neutral tone, never conflicts with A/B colors) */}
      {(coverage.neededCredits ?? null) !== null && (
        <div
          className={`evi--meter ${coverage.complete ? "evi--meter-done" : ""}`}
          title={`Credits ${coverage.earnedCredits}/${coverage.neededCredits}`}
        >
          <div
            className="evi--meter-fill"
            style={{
              width: `${Math.min(100, Math.floor( (coverage.earnedCredits / (coverage.neededCredits || 1)) * 100 ))}%`,
            }}
          />
          <span className="evi--meter-label">
            {coverage.earnedCredits}/{coverage.neededCredits}
          </span>
        </div>
      )}

      {/* small pill counts */}
      {pills && (
        <div className="evi--pills">
          {pills.c > 0 && <span className="evi--pill evi--ok" title="Completed">✓ {pills.c}</span>}
          {pills.ip > 0 && <span className="evi--pill evi--ip" title="In progress">↻ {pills.ip}</span>}
          {pills.p > 0 && <span className="evi--pill evi--xfer" title="Transfer pending">✳ {pills.p}</span>}
        </div>
      )}
    </div>
  );
};