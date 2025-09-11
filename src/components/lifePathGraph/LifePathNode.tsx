import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GraphNode } from '@/types/lifePathGraph';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LP_VISUAL_V2 } from '@/lib/flags';
import { 
  BookOpen, 
  Briefcase, 
  Award, 
  Code, 
  GraduationCap, 
  Target,
  FileText,
  Clock,
  DollarSign,
  MapPin
} from 'lucide-react';
import { StepBadge } from './StepBadge';
import { CapMeter } from './CapMeter';
import { GhostReasonChip } from './GhostReasonChip';
import { OverlapIndicator } from './OverlapIndicator';
import { TrustSignals } from './TrustSignals';

interface LifePathNodeData {
  node: GraphNode;
  isSelected: boolean;
  isInPath: boolean;
  isMainPath?: boolean;
  stepNumber?: number;
  pathType?: string;
  showGhost?: boolean;
  ghostReason?: string;
  overlapCount?: number;
  overlapGoals?: string[];
  transferUsed?: number;
  examUsed?: number;
  residencyMet?: number;
  tier?: 'on-path' | 'related' | 'off-path';
  isHovered?: boolean;
  showPreviousPath?: boolean;
  highlightedPrimaryNodes?: Set<string> | null;
  highlightedComparisonNodes?: Set<string> | null;
}

interface LifePathNodeProps {
  data: LifePathNodeData;
}

export function LifePathNodeComponent({ data }: LifePathNodeProps) {
  const { 
    node, 
    isSelected, 
    isInPath, 
    isMainPath, 
    stepNumber, 
    pathType, 
    showGhost, 
    ghostReason,
    overlapCount,
    overlapGoals,
    transferUsed = 0,
    examUsed = 0,
    residencyMet = 0,
    tier,
    isHovered = false,
    showPreviousPath = false
  } = data;

  const getNodeIcon = () => {
    switch (node.type) {
      case 'skill': return <Target className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'job': return <Briefcase className="w-4 h-4" />;
      case 'certification': return <Award className="w-4 h-4" />;
      case 'credential': return <GraduationCap className="w-4 h-4" />;
      case 'creditBlock': return <BookOpen className="w-4 h-4" />;
      case 'project': return <Code className="w-4 h-4" />;
      case 'exam': return <FileText className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getNodeColor = () => {
    // Enhanced multipath-aware styling with string-coerced ID checks
    const key = String(node.id);
    const inPrimary = !!data?.highlightedPrimaryNodes?.has?.(key);
    const inCompare = !!data?.highlightedComparisonNodes?.has?.(key);
    
    let baseColor = '';
    if (inPrimary) {
      baseColor = 'node--primary border-primary bg-primary/10 shadow-lg';
    } else if (inCompare) {
      baseColor = 'node--comparison border-amber-400 bg-amber-50 dark:bg-amber-950/20';
    } else if (tier) {
      switch (tier) {
        case 'on-path':
          baseColor = 'border-primary bg-primary/10 shadow-lg';
          break;
        case 'related':
          baseColor = 'border-secondary bg-secondary/10';
          break;
        case 'off-path':
          baseColor = 'border-muted bg-muted/5';
          break;
      }
    }
      
    if (isSelected) baseColor += ' ring-2 ring-primary';
    if (isHovered) baseColor += ' ring-1 ring-primary/50 hover-gentle transition-all duration-200';
    if (showPreviousPath) baseColor += ' opacity-40 transition-opacity duration-1000';
    return baseColor;

    // Legacy styling
    if (isSelected) return 'ring-2 ring-primary';
    if (pathType === 'fastest') return 'border-primary bg-primary/10';
    if (pathType === 'cheapest') return 'border-secondary bg-secondary/10';
    if (pathType === 'credit-max') return 'border-accent bg-accent/10';
    if (isInPath) return 'border-primary bg-primary/10';
    
    switch (node.type) {
      case 'skill': return 'border-secondary bg-secondary/10';
      case 'course': return 'border-primary bg-primary/10';
      case 'job': return 'border-accent bg-accent/10';
      case 'certification': return 'border-secondary bg-secondary/10';
      case 'project': return 'border-accent bg-accent/10';
      case 'exam': return 'border-muted bg-muted/10';
      default: return 'border-muted bg-muted/10';
    }
  };

  const getBadgeVariant = () => {
    switch (node.type) {
      case 'skill': return 'secondary';
      case 'course': return 'default';
      case 'job': return 'destructive';
      case 'certification': return 'outline';
      case 'project': return 'secondary';
      case 'exam': return 'outline';
      default: return 'secondary';
    }
  };

  const tierClass = tier ? `lp-node-${tier}` : '';
  
  // Enhanced node class assignment with string-coerced IDs
  const key = String(node.id);
  const inPrimary = !!data?.highlightedPrimaryNodes?.has(key);
  const inCompare = !!data?.highlightedComparisonNodes?.has(key);
  
  let nodeClassName = 'lp-node';
  if (inPrimary) nodeClassName += ' node--primary';
  else if (inCompare) nodeClassName += ' node--comparison';
  
  return (
    <div
      data-testid="lp-node"
      data-id={node.id}
      data-highlighted={inPrimary || inCompare ? 'true' : 'false'}
      className={`${nodeClassName} ${tierClass}`}
    >
      {/* Visual V2: Use left/right anchoring for better routing */}
      <Handle
        type="target"
        position={LP_VISUAL_V2 ? Position.Left : Position.Top}
        id="target"
        style={{
          background: 'hsl(var(--primary))',
          border: '2px solid hsl(var(--background))',
          width: 12,
          height: 12,
        }}
      />
       
      <Card 
        className={`
          w-64 cursor-pointer
          ${getNodeColor()}
          ${tierClass}
          transition-all duration-200 ease-in-out
          shadow-sm hover:shadow-md
        `}
        style={{
          minWidth: 'var(--lp-node-min-width, 280px)',
          maxWidth: 'var(--lp-node-max-width, 350px)',
        }}
      >
        <CardContent className="p-4">
          {/* Step Number Badge – show whenever node is in main path and stepNumber >= 1 */}
          {isMainPath && typeof stepNumber === "number" && stepNumber > 0 && (
            <StepBadge stepNumber={stepNumber} isMainPath />
          )}
          
          {/* Overlap Indicator */}
          <OverlapIndicator count={overlapCount || 1} goals={overlapGoals} />
          
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getNodeIcon()}
              <Badge variant={getBadgeVariant()} className="text-xs">
                {node.type}
              </Badge>
            </div>
            
            {node.aceRecommended && (
              <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950/20">
                ACE
              </Badge>
            )}
          </div>
          
          {/* Trust Signals - Critical decision-making information */}
          <div className="mb-3">
            <TrustSignals node={node} compact />
          </div>
          
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {node.title}
          </h3>
          
          {node.institution && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3" />
              {node.institution}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {node.estimatedHours}h
            </div>
            
            {node.cost > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${node.cost.toLocaleString()}
              </div>
            )}
            
            {node.credits && (
              <div className="text-xs font-medium">
                {node.credits} cr
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {node.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          
          {/* Difficulty indicator */}
          <div className="flex items-center gap-1 mt-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < node.difficulty 
                      ? 'bg-orange-400' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Level {node.difficulty}
            </span>
          </div>
          
          {/* Cap Meter for Credentials */}
          {node.type === 'credential' && node.policy && (
            <CapMeter
              transferUsed={transferUsed}
              transferCap={node.policy.maxTransferCredits || 60}
              examUsed={examUsed}
              examCap={node.policy.examCap || 0}
              residencyRequired={node.policy.residencyCredits || 30}
              residencyMet={residencyMet}
            />
          )}
          
          {/* Ghost Reason Chip – only when node is ghosted and we're not showing alternatives */}
          {showGhost && ghostReason && (
            <GhostReasonChip reason={ghostReason} />
          )}
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={LP_VISUAL_V2 ? Position.Right : Position.Bottom}
        id="source"
        style={{
          background: 'hsl(var(--primary))',
          border: '2px solid hsl(var(--background))',
          width: 12,
          height: 12,
        }}
      />
    </div>
  );
}