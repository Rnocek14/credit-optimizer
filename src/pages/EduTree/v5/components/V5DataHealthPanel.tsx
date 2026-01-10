/**
 * V5 Data Health Debug Panel
 * 
 * Shows real-time data diagnostics for V5 planning engine
 * Helps verify planSource, coverage, and policy connection
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database,
  FileCode,
  Shield
} from 'lucide-react';

interface V5DataHealthPanelProps {
  diagnostics: {
    moduleCount: number;
    blockCount: number;
    optionCount: number;
    coverage: number;
    totalCredits: number;
    planSource: 'real' | 'mock' | 'fixture';
    // Accept canonical source types from hook ('pack' | 'static' | 'none')
    policySource: 'pack' | 'static' | 'none';
    anchorSchool?: string;
  };
  visible?: boolean;
}

export function V5DataHealthPanel({ diagnostics, visible = true }: V5DataHealthPanelProps) {
  if (!visible) return null;

  const {
    moduleCount,
    blockCount,
    optionCount,
    coverage,
    totalCredits,
    planSource,
    policySource,
    anchorSchool,
  } = diagnostics;

  // Gating thresholds
  const passesCredits = totalCredits >= 110;
  const passesBlocks = blockCount > 0;
  const passesCoverage = coverage >= 80;
  const passesAll = passesCredits && passesBlocks && passesCoverage;

  const StatusIcon = ({ pass }: { pass: boolean }) =>
    pass ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 bg-background/95 backdrop-blur-sm border shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">V5 Data Health</span>
        <Badge 
          variant={passesAll ? 'default' : 'destructive'} 
          className="ml-auto text-xs"
        >
          {passesAll ? 'READY' : 'FAILING'}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        {/* Plan Source */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <FileCode className="h-3 w-3" />
            planSource
          </span>
          <Badge 
            variant={planSource === 'real' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {planSource}
          </Badge>
        </div>

        {/* Policy Source */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            policySource
          </span>
          <Badge 
            variant={policySource === 'pack' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {/* Map canonical 'pack' to 'scraped' for display */}
            {policySource === 'pack' ? 'scraped' : policySource}{anchorSchool ? ` (${anchorSchool})` : ''}
          </Badge>
        </div>

        <hr className="my-2 border-border/50" />

        {/* Gating Conditions */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Credits</span>
          <div className="flex items-center gap-1">
            <StatusIcon pass={passesCredits} />
            <span>{totalCredits}/110</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Blocks</span>
          <div className="flex items-center gap-1">
            <StatusIcon pass={passesBlocks} />
            <span>{blockCount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Coverage</span>
          <div className="flex items-center gap-1">
            <StatusIcon pass={passesCoverage} />
            <span>{coverage.toFixed(0)}%/80%</span>
          </div>
        </div>

        <hr className="my-2 border-border/50" />

        {/* Raw Counts */}
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Modules</span>
          <span>{moduleCount}</span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Options</span>
          <span>{optionCount}</span>
        </div>
      </div>

      {!passesAll && (
        <div className="mt-3 p-2 bg-destructive/10 rounded text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <span>
            Template generation will use mocks until all conditions pass.
          </span>
        </div>
      )}
    </Card>
  );
}
