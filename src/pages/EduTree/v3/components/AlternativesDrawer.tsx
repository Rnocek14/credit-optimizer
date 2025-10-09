/**
 * Phase 3b: Alternatives Drawer
 * 
 * Shows alternative paths at checkpoint fork points
 * Displays ranked alternatives with prerequisite status
 */

import { X, CheckCircle2, Lock, AlertTriangle, TrendingUp, Clock, DollarSign, Award } from 'lucide-react';
import type { GraphNode } from '@/types/lifePathGraph';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlternativeOption {
  node: GraphNode;
  rank: number;
  score: number;
  prerequisiteStatus: 'ready' | 'locked' | 'waiver';
  missingPrereqs?: string[];
}

interface AlternativesDrawerProps {
  open: boolean;
  onClose: () => void;
  sourceNode: {
    id: string;
    title: string;
  };
  alternatives: AlternativeOption[];
  onSelectAlternative?: (nodeId: string) => void;
  onPreviewAlternative?: (nodeId: string) => void;
}

export function AlternativesDrawer({
  open,
  onClose,
  sourceNode,
  alternatives,
  onSelectAlternative,
  onPreviewAlternative,
}: AlternativesDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-2xl h-[85vh] bg-card border-l border-t shadow-2xl rounded-tl-xl pointer-events-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">Choose Your Path</h2>
            <p className="text-sm text-muted-foreground mt-1">
              From: <span className="font-medium text-foreground">{sourceNode.title}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-primary/5 border-b">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">
              {alternatives.length} alternative path{alternatives.length !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>

        {/* Alternatives List */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-4">
            {alternatives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No alternatives available at this checkpoint.</p>
              </div>
            ) : (
              alternatives.map((alt) => (
                <AlternativeCard
                  key={alt.node.id}
                  alternative={alt}
                  onSelect={() => onSelectAlternative?.(alt.node.id)}
                  onPreview={() => onPreviewAlternative?.(alt.node.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function AlternativeCard({
  alternative,
  onSelect,
  onPreview,
}: {
  alternative: AlternativeOption;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const { node, rank, score, prerequisiteStatus, missingPrereqs } = alternative;

  const statusConfig = {
    ready: {
      icon: CheckCircle2,
      label: 'Ready',
      variant: 'default' as const,
      className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    },
    locked: {
      icon: Lock,
      label: 'Locked',
      variant: 'secondary' as const,
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
    waiver: {
      icon: AlertTriangle,
      label: 'Waiver Available',
      variant: 'outline' as const,
      className: 'bg-warning/10 text-warning-foreground border-warning/20',
    },
  };

  const status = statusConfig[prerequisiteStatus];
  const StatusIcon = status.icon;

  return (
    <div className="group relative bg-card border rounded-lg p-4 hover:border-primary/50 transition-all hover:shadow-md">
      {/* Rank Badge */}
      {rank <= 2 && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
          #{rank}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {node.title}
          </h3>
          {node.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {node.description}
            </p>
          )}
        </div>
        
        <Badge className={status.className}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{node.estimatedHours}h</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">${node.cost.toLocaleString()}</span>
        </div>
        {node.credits && (
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{node.credits} cr</span>
          </div>
        )}
      </div>

      {/* Missing Prerequisites */}
      {prerequisiteStatus === 'locked' && missingPrereqs && missingPrereqs.length > 0 && (
        <div className="mb-3 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs">
          <p className="font-medium text-destructive mb-1">Missing prerequisites:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            {missingPrereqs.slice(0, 3).map((prereq, i) => (
              <li key={i}>{prereq}</li>
            ))}
            {missingPrereqs.length > 3 && (
              <li className="text-destructive">+{missingPrereqs.length - 3} more...</li>
            )}
          </ul>
        </div>
      )}

      {/* Tags */}
      {node.tags && node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {node.tags.slice(0, 4).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tag.replace('slug:', '')}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex-1"
        >
          Preview
        </Button>
        <Button
          size="sm"
          onClick={onSelect}
          disabled={prerequisiteStatus === 'locked'}
          className="flex-1"
        >
          {prerequisiteStatus === 'locked' ? 'Locked' : 'Select'}
        </Button>
      </div>

      {/* Score indicator (dev only) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground/50">
          Score: {score.toFixed(2)}
        </div>
      )}
    </div>
  );
}
