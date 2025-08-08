import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePhase4Integration } from "@/hooks/usePhase4Integration";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";

interface SkillGapTrackerProps { userId?: string | null }

export function SkillGapTracker({ userId }: SkillGapTrackerProps) {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useUserProfile(userId || '');
  const { sharedState, isLoading: pivotLoading } = usePhase4Integration(userId || '');

  const skills = useMemo(() => {
    const have = (profile?.skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
    const target = (sharedState.selectedPivot?.skills_to_develop || sharedState.selectedPivot?.required_skills || ['Product Strategy','Market Analysis','User Research']) as string[];
    const missing = target.filter((s) => !have.includes(s));
    const overlap = target.filter((s) => have.includes(s));
    return { have, target, missing, overlap };
  }, [profile?.skills, sharedState.selectedPivot]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Gap Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {profileLoading || pivotLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">Target career skills</div>
            <div className="flex flex-wrap gap-1">
              {skills.target.map((s) => (<Badge key={s} variant="secondary" className="text-xs">{s}</Badge>))}
            </div>
            <div className="text-sm text-muted-foreground">You already have</div>
            <div className="flex flex-wrap gap-1">
              {skills.overlap.length ? skills.overlap.map((s) => (<Badge key={s} variant="outline" className="text-xs">{s}</Badge>)) : <span className="text-xs">No direct overlaps</span>}
            </div>
            <div className="text-sm text-muted-foreground">Missing</div>
            <div className="flex flex-wrap gap-1">
              {skills.missing.length ? skills.missing.map((s) => (<Badge key={s} className="text-xs">{s}</Badge>)) : <span className="text-xs">No gaps detected</span>}
            </div>
            <button onClick={() => navigate('/skill-tree')} className="text-primary text-sm">Open in Skill Tree →</button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
