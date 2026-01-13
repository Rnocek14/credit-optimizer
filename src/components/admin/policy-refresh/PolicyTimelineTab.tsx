import { usePolicyTimeline } from '@/hooks/usePolicyTimeline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, XCircle, AlertTriangle, Clock, 
  GitMerge, FileEdit, Shield, ArrowUpCircle, Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PolicyTimelineTabProps {
  runId: string | null;
  institution: string | null;
}

const EVENT_CONFIG: Record<string, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}> = {
  scan_started: { icon: Clock, color: 'text-blue-500', label: 'Scan Started', variant: 'info' },
  scan_completed: { icon: CheckCircle, color: 'text-green-500', label: 'Scan Completed', variant: 'success' },
  scan_failed: { icon: XCircle, color: 'text-red-500', label: 'Scan Failed', variant: 'error' },
  merge_created: { icon: GitMerge, color: 'text-purple-500', label: 'Draft Pack Created', variant: 'info' },
  diffs_written: { icon: FileEdit, color: 'text-blue-500', label: 'Diffs Recorded', variant: 'info' },
  conflict_detected: { icon: AlertTriangle, color: 'text-yellow-500', label: 'Conflicts Detected', variant: 'warning' },
  override_set: { icon: Shield, color: 'text-indigo-500', label: 'Override Set', variant: 'info' },
  promotion_attempted: { icon: ArrowUpCircle, color: 'text-blue-500', label: 'Promotion Attempted', variant: 'info' },
  promoted: { icon: Zap, color: 'text-green-500', label: 'Pack Promoted', variant: 'success' },
  promote_blocked: { icon: XCircle, color: 'text-red-500', label: 'Promotion Blocked', variant: 'error' },
};

export function PolicyTimelineTab({ runId, institution }: PolicyTimelineTabProps) {
  const { timeline, isLoading } = usePolicyTimeline(runId, institution);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading timeline...</div>;
  }

  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No events recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="relative pl-6 pr-4 py-2">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {timeline.map((event) => {
            const config = EVENT_CONFIG[event.event_type] || {
              icon: Clock,
              color: 'text-muted-foreground',
              label: event.event_type,
              variant: 'info' as const,
            };
            const Icon = config.icon;

            return (
              <div key={event.id} className="relative flex gap-3">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center bg-background border-2",
                  config.variant === 'success' && "border-green-500",
                  config.variant === 'warning' && "border-yellow-500",
                  config.variant === 'error' && "border-red-500",
                  config.variant === 'info' && "border-blue-500"
                )}>
                  <Icon className={cn("h-3 w-3", config.color)} />
                </div>

                {/* Event card */}
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{config.label}</span>
                        {event.source !== 'event' && (
                          <Badge variant="outline" className="text-[10px] px-1">
                            synthesized
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                        <span className="mx-1">·</span>
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {/* Event payload details */}
                  <EventPayloadDetails eventType={event.event_type} payload={event.payload} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

function EventPayloadDetails({ eventType, payload }: { eventType: string; payload: Record<string, unknown> }) {
  if (!payload || Object.keys(payload).length === 0) return null;

  switch (eventType) {
    case 'scan_completed':
      return (
        <div className="mt-2 text-xs space-y-1">
          {payload.status && <div>Status: <span className="font-medium">{String(payload.status)}</span></div>}
          {payload.reason && <div className="text-yellow-600">Reason: {String(payload.reason)}</div>}
          {payload.metrics && (
            <div className="flex gap-2 flex-wrap mt-1">
              {(payload.metrics as Record<string, unknown>).trust_tier && (
                <Badge variant="secondary" className="text-[10px]">
                  Tier: {String((payload.metrics as Record<string, unknown>).trust_tier)}
                </Badge>
              )}
              {(payload.metrics as Record<string, unknown>).merge_score && (
                <Badge variant="secondary" className="text-[10px]">
                  Score: {String((payload.metrics as Record<string, unknown>).merge_score)}
                </Badge>
              )}
            </div>
          )}
        </div>
      );

    case 'merge_created':
      return (
        <div className="mt-2 text-xs space-y-1">
          {payload.confidence_score && (
            <div>Confidence: <span className="font-medium">{String(payload.confidence_score)}</span></div>
          )}
          {payload.pack_scope && (
            <Badge variant="outline" className="text-[10px]">{String(payload.pack_scope)} scoped</Badge>
          )}
          {payload.blocked_reason && (
            <div className="text-yellow-600">Blocked: {String(payload.blocked_reason)}</div>
          )}
        </div>
      );

    case 'diffs_written':
      const byAction = payload.by_action as Record<string, number> | undefined;
      return (
        <div className="mt-2 text-xs">
          <div className="flex gap-2 flex-wrap">
            <span>Total: {String(payload.total)}</span>
            {byAction?.added && (
              <Badge className="bg-green-500/20 text-green-600 text-[10px]">+{byAction.added} added</Badge>
            )}
            {byAction?.updated && (
              <Badge className="bg-blue-500/20 text-blue-600 text-[10px]">{byAction.updated} updated</Badge>
            )}
            {byAction?.removed && (
              <Badge className="bg-red-500/20 text-red-600 text-[10px]">-{byAction.removed} removed</Badge>
            )}
          </div>
        </div>
      );

    case 'conflict_detected':
      const conflicts = payload.conflicts as Array<{ field: string }> | undefined;
      return (
        <div className="mt-2 text-xs">
          <div className="text-yellow-600">
            {String(payload.conflict_count)} conflict(s) detected
          </div>
          {conflicts && conflicts.length > 0 && (
            <div className="mt-1 flex gap-1 flex-wrap">
              {conflicts.slice(0, 3).map((c, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/50">
                  {String(c.field)}
                </Badge>
              ))}
              {conflicts.length > 3 && (
                <span className="text-muted-foreground">+{conflicts.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      );

    case 'override_set':
      return (
        <div className="mt-2 text-xs space-y-1">
          <div>Field: <span className="font-mono">{String(payload.field_name)}</span></div>
          <div>Value: <span className="font-mono">{JSON.stringify(payload.override_value)}</span></div>
          {payload.note && <div className="text-muted-foreground italic">{String(payload.note)}</div>}
          {payload.citation_url && (
            <a 
              href={String(payload.citation_url)} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View source →
            </a>
          )}
        </div>
      );

    case 'promoted':
      return (
        <div className="mt-2 text-xs space-y-1">
          {payload.confidence_score && (
            <div>Confidence: <span className="font-medium text-green-600">{String(payload.confidence_score)}</span></div>
          )}
          {payload.superseded_pack_id && (
            <div className="text-muted-foreground">Superseded: {String(payload.superseded_pack_id).slice(0, 8)}</div>
          )}
        </div>
      );

    case 'promote_blocked':
      return (
        <div className="mt-2 text-xs">
          <div className="text-red-600">Reason: {String(payload.blocked_reason)}</div>
        </div>
      );

    default:
      return null;
  }
}
