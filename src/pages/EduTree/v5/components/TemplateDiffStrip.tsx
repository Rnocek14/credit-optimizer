import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { TemplatePreview } from '../engine/previewTemplate';
import { cn } from '@/lib/utils';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { getClientSessionId } from '@/utils/telemetrySampling';
import { formatCost } from '../utils/formatters';
import { FEATURE_FLAGS } from '../config/featureFlags';

interface TemplateDiffStripProps {
  preview: TemplatePreview;
  templateLabel: string;
  moduleId: string;
  keepPinned: boolean;
  onKeepPinnedChange: (value: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function TemplateDiffStrip({
  preview,
  templateLabel,
  moduleId,
  keepPinned,
  onKeepPinnedChange,
  onApply,
  onCancel,
  isApplying = false,
}: TemplateDiffStripProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [lastEnterPress, setLastEnterPress] = useState(0);

  const hasRemovals = preview.removed.length > 0;
  const hasPinnedRemovals = preview.removedPinned.length > 0;
  const hasAdditions = preview.added.length > 0;
  const isNoNetChange = preview.added.length === 0 && preview.removed.length === 0;

  // Format delta with sign
  const formatDelta = (value: number, prefix = '', suffix = '') => {
    if (value === 0) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${prefix}${value}${suffix}`;
  };

  const diffParts = [
    formatDelta(preview.costDelta, '$'),
    formatDelta(preview.weeksDelta, '', 'w'),
    formatDelta(preview.creditsDelta, '', 'cr'),
  ].filter(Boolean);

  const diffDescription = diffParts.length > 0 
    ? diffParts.join(' • ') 
    : 'No net change';

  // Track when apply blocked or executed
  const handleApplyClick = () => {
    if (isNoNetChange || isApplying) return;
    
    if (isNoNetChange) {
      void trackTelemetryEvent({
        task: 'apply_blocked_no_net_change',
        scope: 'module',
        complexity: { 
          templateLabel, 
          moduleId,
          sessionId: getClientSessionId(),
        }
      });
      return;
    }
    
    void trackTelemetryEvent({
      task: 'template_preview_confirmed',
      scope: 'module',
      complexity: { 
        templateLabel, 
        keepPinned,
        costDelta: preview.costDelta,
        weeksDelta: preview.weeksDelta,
        sessionId: getClientSessionId(),
      }
    });
    
    onApply();
  };

  // Telemetry for keepPinned toggle
  const handleKeepPinnedChange = (checked: boolean) => {
    onKeepPinnedChange(checked);
    void trackTelemetryEvent({
      task: 'diff_keep_pinned_toggled',
      scope: 'module',
      complexity: {
        templateLabel,
        value: checked,
        affectedCount: preview.removedPinned.length
      }
    });
  };


  // Track cross-scope preview (once on mount/change)
  useEffect(() => {
    if (preview.touchesOtherScopes) {
      const crossScopeCount = preview.added.filter(i => i.moduleId !== preview.added[0]?.moduleId).length;
      void trackTelemetryEvent({
        task: 'cross_scope_preview_seen',
        scope: 'module',
        complexity: {
          templateLabel,
          affectedModules: crossScopeCount
        }
      });
    }
  }, [preview.touchesOtherScopes, preview.added, templateLabel]);

  // Local keyboard handler (not global)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isNoNetChange && !isApplying) {
      // Debounce double-press (250ms)
      const now = Date.now();
      if (now - lastEnterPress < 250) return;
      setLastEnterPress(now);
      
      e.preventDefault();
      handleApplyClick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      role="region"
      aria-label="Template change preview"
      aria-live="polite"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-20 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Preview: {templateLabel}
            </span>
            {hasPinnedRemovals && (
              <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Pinned affected
              </Badge>
            )}
          </div>
          
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
            {hasRemovals && (
              <div>Removing: {preview.removed.length} course{preview.removed.length !== 1 ? 's' : ''}</div>
            )}
            {hasAdditions && (
              <div>Adding: {preview.added.length} course{preview.added.length !== 1 ? 's' : ''}</div>
            )}
            <div className="font-medium">Net: {diffDescription}</div>
          </div>

          {preview.wouldExceedCredits && (
            <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Over by {preview.exceedsBy}cr
            </div>
          )}

          {preview.touchesOtherScopes && (
            <div className="mt-2 text-xs text-muted-foreground">
              ℹ️ Includes prerequisites from other modules
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-start gap-2">
          <Button
            size="sm"
            onClick={handleApplyClick}
            className="h-8 text-xs"
            disabled={isNoNetChange || isApplying}
            title={
              isNoNetChange 
                ? 'No changes to apply' 
                : !keepPinned && hasPinnedRemovals 
                  ? `Apply (will replace ${preview.removedPinned.length} pinned course${preview.removedPinned.length !== 1 ? 's' : ''})`
                  : 'Apply template changes'
            }
            autoFocus
          >
            {isApplying 
              ? 'Applying...' 
              : !keepPinned && hasPinnedRemovals 
                ? `Apply (replaces ${preview.removedPinned.length})`
                : 'Apply'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Keep Pinned Toggle */}
      {hasPinnedRemovals && !isNoNetChange && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={keepPinned}
            onChange={(e) => handleKeepPinnedChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-xs text-blue-900 dark:text-blue-100">
            Keep {preview.removedPinned.length} pinned course{preview.removedPinned.length !== 1 ? 's' : ''}
          </span>
        </label>
      )}

      {/* Details Expander */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:underline"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showDetails ? 'Hide' : 'Show'} course details
      </button>

      {/* Expandable Details */}
      {showDetails && (
        <div className="space-y-2 pt-2 border-t border-blue-200 dark:border-blue-800">
          {hasRemovals && (
            <div>
              <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                Removing:
              </div>
              <div className="space-y-1">
                {preview.removed.map(item => (
                  <div
                    key={item.courseId}
                    className={cn(
                      "text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300",
                      item.status === 'pinned' && "border border-yellow-400"
                    )}
                  >
                    {item.status === 'pinned' && '📌 '}
                    {item.courseId} ({item.credits}cr)
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasAdditions && (
            <div>
              <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                Adding:
              </div>
              <div className="space-y-1">
                {preview.added.map(item => (
                  <div
                    key={item.courseId}
                    className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 flex items-center justify-between gap-2"
                  >
                    <span>
                      {item.courseId} ({item.credits}cr, {formatCost(item.cost_usd)})
                    </span>
                    {FEATURE_FLAGS.v5_cross_scope_details && item.moduleId !== moduleId && (
                      <Badge variant="outline" className="text-xs py-0">
                        Other Module
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
