/**
 * Invariant Explainer Panel
 * 
 * "Why blocked?" panel with human explanation and fix action buttons.
 */

import React from 'react';
import { X, AlertCircle, AlertTriangle, Lightbulb, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getExplainer, 
  isKnownInvariantCode, 
  UNKNOWN_CODE_ADMIN_TITLE,
  type InvariantCode 
} from '@/lib/invariant';
import { 
  getPrioritizedFixes, 
  type FixActionContext, 
  type ResolvedFix 
} from '@/lib/invariant/actionableFixes';
import { FixActionList } from '@/components/invariant/FixActionButton';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface InvariantExplainerPanelProps {
  code: string;
  context: FixActionContext;
  onClose?: () => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function InvariantExplainerPanel({
  code,
  context,
  onClose,
  className,
}: InvariantExplainerPanelProps) {
  const isKnown = isKnownInvariantCode(code);
  const explainer = isKnown ? getExplainer(code as InvariantCode) : null;
  const fixes = getPrioritizedFixes(code, context, { maxFixes: 5, adminOnly: true });

  const severity = explainer?.severity ?? 'unknown';
  const Icon = severity === 'hard' ? AlertCircle : AlertTriangle;
  
  const headerBg = severity === 'hard' 
    ? 'bg-destructive/5 border-destructive/20' 
    : severity === 'warn'
    ? 'bg-yellow-500/5 border-yellow-500/20'
    : 'bg-muted/50';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('pb-3', headerBg)}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className={cn(
                'h-5 w-5',
                severity === 'hard' ? 'text-destructive' : 
                severity === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 
                'text-muted-foreground'
              )} />
              <CardTitle className="text-lg">
                {explainer?.title ?? UNKNOWN_CODE_ADMIN_TITLE}
              </CardTitle>
            </div>
            <CardDescription className="font-mono text-xs">
              {code}
            </CardDescription>
          </div>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Unknown code warning */}
        {!isKnown && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This invariant code is not in the explainer registry. Contact engineering if this persists.
            </AlertDescription>
          </Alert>
        )}

        {/* Explanation */}
        {explainer && (
          <>
            <div>
              <h4 className="text-sm font-medium mb-1.5">What happened</h4>
              <p className="text-sm text-muted-foreground">
                {explainer.explanation}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1.5">Why it matters</h4>
              <p className="text-sm text-muted-foreground">
                {explainer.impact}
              </p>
            </div>

            {/* Category badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Category:</span>
              <Badge variant="secondary" className="text-xs capitalize">
                {explainer.category.replace(/_/g, ' ')}
              </Badge>
            </div>

            <Separator />

            {/* Suggested fixes from explainer (text list) */}
            {explainer.suggestedFixes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Suggested Fixes
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {explainer.suggestedFixes.map((fix, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Actionable fix buttons */}
        {fixes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
              <FixActionList
                fixes={fixes}
                context={context}
                layout="vertical"
                maxVisible={5}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
