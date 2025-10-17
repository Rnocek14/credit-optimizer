/**
 * DegreeValidationPanel - Display degree progress and missing requirements
 */
import React from 'react';
import { ValidationResult } from '../types/v4';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface DegreeValidationPanelProps {
  validation: ValidationResult;
}

export function DegreeValidationPanel({ validation }: DegreeValidationPanelProps) {
  const progressPercent = (validation.totalCredits.planned / validation.totalCredits.required) * 100;
  
  return (
    <Card className="p-4 space-y-4 bg-card border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Degree Progress</h3>
        <Badge variant={validation.isValid ? 'default' : 'secondary'}>
          {validation.isValid ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</>
          ) : (
            <><AlertCircle className="w-3 h-3 mr-1" /> In Progress</>
          )}
        </Badge>
      </div>
      
      {/* Total Credits */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Total Credits</span>
          <span className="text-muted-foreground">
            {validation.totalCredits.planned} / {validation.totalCredits.required}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
      
      {/* By Category */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Requirements by Category</h4>
        <div className="space-y-1.5">
          {Array.from(validation.byCategory.entries()).map(([cat, val]) => {
            const isComplete = val.planned >= val.required;
            const percent = (val.planned / val.required) * 100;
            
            return (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="capitalize text-muted-foreground">{cat}</span>
                <div className="flex items-center gap-2">
                  <Progress value={percent} className="h-1.5 w-16" />
                  <Badge 
                    variant={isComplete ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {val.planned} / {val.required}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Missing Items */}
      {validation.missing.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Missing Requirements
          </h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {validation.missing.map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-destructive">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Warnings
          </h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {validation.warnings.map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-amber-600 dark:text-amber-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
