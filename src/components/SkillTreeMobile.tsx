import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  Star,
  Award,
  Target
} from 'lucide-react';

interface MobileSkillNodeProps {
  skill: {
    id: string;
    title: string;
    category?: string;
    difficulty?: number;
    xp_value?: number;
    verified?: boolean;
    cri_score?: number;
    instructor_rating?: number;
  };
  onClick: () => void;
  isGoal?: boolean;
  isCheckpoint?: boolean;
}

// PR-7: Mobile-optimized skill node with large tap targets
const MobileSkillNode: React.FC<MobileSkillNodeProps> = ({
  skill,
  onClick,
  isGoal,
  isCheckpoint
}) => {
  return (
    <Card 
      className={`
        p-4 mb-3 cursor-pointer transition-all duration-200 
        hover:shadow-md active:scale-[0.98]
        ${isGoal ? 'border-primary bg-primary/5' : ''}
        ${isCheckpoint ? 'border-success bg-success/5' : ''}
        ${skill.verified ? 'border-success' : 'border-border'}
      `}
      style={{ minHeight: '80px' }} // PR-7: Minimum 80px height for tap targets
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-base leading-tight truncate">
              {skill.title}
            </h3>
            {skill.verified && (
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            )}
            {isGoal && (
              <Target className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            {isCheckpoint && (
              <Award className="w-4 h-4 text-success flex-shrink-0" />
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {skill.category && (
              <Badge variant="secondary" className="text-xs">
                {skill.category}
              </Badge>
            )}
            
            {skill.xp_value && (
              <Badge variant="outline" className="text-xs">
                {skill.xp_value} XP
              </Badge>
            )}
            
            {skill.difficulty && (
              <Badge 
                variant={skill.difficulty > 7 ? "destructive" : skill.difficulty > 4 ? "default" : "secondary"} 
                className="text-xs"
              >
                L{skill.difficulty}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {skill.cri_score && skill.cri_score > 0 && (
              <div className="flex items-center gap-1">
                <div className={`
                  w-2 h-2 rounded-full 
                  ${skill.cri_score >= 80 ? 'bg-success' : skill.cri_score >= 60 ? 'bg-warning' : 'bg-destructive'}
                `} />
                CRI: {Math.round(skill.cri_score)}
              </div>
            )}
            
            {skill.instructor_rating && skill.instructor_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {skill.instructor_rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="w-10 h-10 p-0 flex-shrink-0" // PR-7: 40x40px minimum tap target
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

interface SkillTreeMobileProps {
  skills: any[];
  onSkillClick: (skill: any) => void;
  goalSkills?: string[];
  checkpointSkills?: string[];
  className?: string;
}

export const SkillTreeMobile: React.FC<SkillTreeMobileProps> = ({
  skills,
  onSkillClick,
  goalSkills = [],
  checkpointSkills = [],
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4 p-4 bg-muted rounded-lg">
        <h2 className="font-semibold text-lg mb-2">Skills Overview</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>Verified: {skills.filter(s => s.verified).length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>Total: {skills.length}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-0">
        {skills.map((skill) => (
          <MobileSkillNode
            key={skill.id}
            skill={skill}
            onClick={() => onSkillClick(skill)}
            isGoal={goalSkills.includes(skill.id)}
            isCheckpoint={checkpointSkills.includes(skill.id)}
          />
        ))}
      </div>
    </div>
  );
};