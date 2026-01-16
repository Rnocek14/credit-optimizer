/**
 * Effective Config Viewer
 * 
 * Displays the effective invariant config used for template evaluation.
 * Shows key fields in a readable table and raw JSON in a collapsible.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2, Copy, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface EffectiveConfigViewerProps {
  config: Record<string, unknown>;
  className?: string;
}

interface ConfigRowProps {
  label: string;
  value: unknown;
  highlight?: boolean;
  warning?: string;
}

// ============================================
// KNOWN CONFIG KEYS
// ============================================

interface ConfigKeyDefinition {
  key: string;
  label: string;
  type?: 'boolean' | 'number' | 'string';
  unit?: string;
}

const KNOWN_CONFIG_KEYS: ConfigKeyDefinition[] = [
  { key: 'unknownCreditsWarnThreshold', label: 'Unknown Credits Warn Threshold', unit: 'credits' },
  { key: 'unknownCreditsActiveHardZero', label: 'Hard Zero for Active Templates', type: 'boolean' },
  { key: 'allowMissingCapsInDraft', label: 'Allow Missing Caps in Draft', type: 'boolean' },
  { key: 'pendingReviewThresholdMultiplier', label: 'Pending Review Multiplier', type: 'number' },
  { key: 'hasOverrides', label: 'Has Institution Overrides', type: 'boolean' },
  { key: 'sourceInstitution', label: 'Source Institution', type: 'string' },
];

// ============================================
// SUBCOMPONENTS
// ============================================

function ConfigRow({ label, value, highlight, warning }: ConfigRowProps) {
  const displayValue = (() => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }
    if (typeof value === 'number') {
      return <span className="font-mono">{value}</span>;
    }
    return <span className="font-mono text-sm">{String(value)}</span>;
  })();

  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-3 rounded-md',
      highlight && 'bg-yellow-500/10'
    )}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {warning && (
          <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
        )}
      </div>
      <div>{displayValue}</div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EffectiveConfigViewer({ config, className }: EffectiveConfigViewerProps) {
  const [isRawOpen, setIsRawOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    toast.success('Config copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract known values
  const knownValues = KNOWN_CONFIG_KEYS.map(({ key, label, type, unit }) => ({
    key,
    label,
    value: config[key],
    type,
    unit,
    highlight: key === 'hasOverrides' && config[key] === true,
  }));

  // Find unknown keys
  const knownKeySet = new Set(KNOWN_CONFIG_KEYS.map(k => k.key));
  const unknownKeys = Object.keys(config).filter(k => !knownKeySet.has(k));

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Effective Config
            </CardTitle>
            <CardDescription>
              Configuration used for this evaluation
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key/Value Table */}
        <div className="divide-y divide-border rounded-md border">
          {knownValues.map(({ key, label, value, highlight }) => (
            <ConfigRow
              key={key}
              label={label}
              value={value}
              highlight={highlight}
            />
          ))}
        </div>

        {/* Unknown keys warning */}
        {unknownKeys.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {unknownKeys.length} additional field{unknownKeys.length > 1 ? 's' : ''} in config
          </div>
        )}

        {/* Overrides indicator */}
        {config.hasOverrides && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
            Institution overrides applied
          </Badge>
        )}

        {/* Raw JSON Collapsible */}
        <Collapsible open={isRawOpen} onOpenChange={setIsRawOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Raw JSON</span>
              {isRawOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto max-h-64">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
