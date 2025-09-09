import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraduationCap, Medal, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TerminalNodeData {
  title: string;
  isEligible: boolean;
  requirements: {
    label: string;
    met: boolean;
    details?: string;
  }[];
  totalCredits: number;
  completedCredits: number;
  isHighlighted?: boolean;
  planningLens?: string | null;
}

export function TerminalNode(props: NodeProps) {
  const { 
    title = 'B.S. Software Engineering', 
    isEligible = false, 
    requirements = [], 
    totalCredits = 120, 
    completedCredits = 0,
    isHighlighted = false,
    planningLens = null
  } = (props.data || {}) as Partial<TerminalNodeData>;

  const safeRequirements = requirements || [];
  const completionPercent = totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0;
  const unmetRequirements = safeRequirements.filter(r => !r.met).length;

  return (
    <div className="relative">
      {/* Target handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-primary border-2 border-background"
        style={{ left: -8 }}
      />

      <Card className={`
        min-w-[300px] max-w-[360px]
        ${isEligible ? 
          'border-green-500 bg-green-50 dark:bg-green-950/30' : 
          'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
        }
        ${isHighlighted ? 'ring-2 ring-primary shadow-xl scale-105' : ''}
        ${planningLens ? 'border-l-4 border-l-accent' : ''}
        transition-all duration-300
      `}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-3">
              {isEligible ? (
                <>
                  <div className="p-2 rounded-full bg-green-500 text-white">
                    <Medal className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-green-700 dark:text-green-300">{title}</div>
                    <div className="text-sm font-normal text-green-600 dark:text-green-400">
                      Ready to Graduate!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-amber-500 text-white">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-amber-700 dark:text-amber-300">{title}</div>
                    <div className="text-sm font-normal text-amber-600 dark:text-amber-400">
                      {unmetRequirements} requirement{unmetRequirements !== 1 ? 's' : ''} remaining
                    </div>
                  </div>
                </>
              )}
            </CardTitle>
            
            {planningLens && (
              <Badge variant="secondary" className="text-xs">
                {planningLens}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Credit Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Credits</span>
              <span className="text-sm font-mono">
                {completedCredits}/{totalCredits}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  isEligible ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Graduation Requirements</div>
            <div className="space-y-1.5">
              {safeRequirements.map((req, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded ${
                    req.met ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
                  }`}
                >
                  {req.met ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm ${
                      req.met ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {req.label}
                    </div>
                    {req.details && (
                      <div className="text-xs text-muted-foreground">
                        {req.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action based on eligibility */}
          {isEligible ? (
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <Medal className="w-4 h-4 mr-2" />
              Apply for Graduation
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              <GraduationCap className="w-4 h-4 mr-2" />
              Complete Requirements First
            </Button>
          )}

          {/* Graduation beacon for highlighting */}
          {isHighlighted && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium shadow-md animate-pulse">
                🎯 Graduation Goal
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}