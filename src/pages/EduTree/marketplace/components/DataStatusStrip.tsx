import { useQuery } from '@tanstack/react-query';
import { fetchTemplateStatusCounts } from '@/shared/lib/api';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Database } from 'lucide-react';

/**
 * Dev-only status strip showing template counts by status.
 */
export function DataStatusStrip() {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['template-status-counts'],
    queryFn: fetchTemplateStatusCounts,
    staleTime: 30000,
  });

  // Only show in development
  if (import.meta.env.PROD) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Database className="h-3 w-3 animate-pulse" />
        <span>Loading template status...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs mb-4 p-2 bg-muted/50 rounded-md border border-dashed">
      <span className="text-muted-foreground font-medium flex items-center gap-1">
        <Database className="h-3 w-3" />
        Templates:
      </span>
      
      <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
        <CheckCircle className="h-3 w-3" />
        {counts?.active || 0} active
      </Badge>
      
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
        <Clock className="h-3 w-3" />
        {counts?.pending || 0} pending
      </Badge>
      
      {(counts?.blocked || 0) > 0 && (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
          <XCircle className="h-3 w-3" />
          {counts?.blocked} blocked
        </Badge>
      )}
      
      <span className="text-muted-foreground ml-auto">
        DEV ONLY
      </span>
    </div>
  );
}
