import { Badge } from "@/components/ui/badge";
import { useFeatureFlags } from "@/lib/featureFlags";

interface Skill {
  name?: string;
  slug?: string;
  weight?: number;
}

interface SkillTagsFallbackProps {
  skills: Skill[];
  className?: string;
  maxDisplay?: number;
}

export function SkillTagsFallback({ 
  skills = [], 
  className = "",
  maxDisplay = 8 
}: SkillTagsFallbackProps) {
  const { skillTreeForceTagsFallback } = useFeatureFlags();
  
  if (!skillTreeForceTagsFallback || !skills.length) {
    return null;
  }

  const displaySkills = skills.slice(0, maxDisplay);
  const hasMore = skills.length > maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {displaySkills.map((skill, index) => (
        <Badge 
          key={`${skill.name || skill.slug}-${index}`}
          variant="secondary" 
          className="text-xs bg-primary/10 text-primary hover:bg-primary/20"
        >
          {skill.name || skill.slug}
        </Badge>
      ))}
      {hasMore && (
        <Badge 
          variant="outline" 
          className="text-xs text-muted-foreground"
        >
          +{skills.length - maxDisplay} more
        </Badge>
      )}
    </div>
  );
}