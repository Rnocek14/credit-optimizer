import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { getCanonicalIds } from '../data/canonicalMappings';
import { TRACK_MAP } from '@/pages/EduTree/data/trackDefinitions';
import type { TrackId } from '@/pages/EduTree/data/trackDefinitions';

interface CanonicalAuditPanelProps {
  trackId: TrackId;
}

export function CanonicalAuditPanel({ trackId }: CanonicalAuditPanelProps) {
  const basket = usePlanBasket(s => s.items);
  
  const track = TRACK_MAP.get(trackId);
  const requiredCanonicalIds = track?.blockIds ?? [];
  
  // Calculate which canonical requirements are satisfied
  const audit = useMemo(() => {
    const satisfied = new Set<string>();
    
    basket.forEach(item => {
      const providerCode = item.providerCode || '';
      const canonicalIds = getCanonicalIds(providerCode, item.courseId);
      canonicalIds.forEach(id => {
        if (requiredCanonicalIds.includes(id)) {
          satisfied.add(id);
        }
      });
    });
    
    const unmet = requiredCanonicalIds.filter(id => !satisfied.has(id));
    const progress = requiredCanonicalIds.length > 0 
      ? (satisfied.size / requiredCanonicalIds.length) * 100 
      : 0;
    
    return { satisfied: Array.from(satisfied), unmet, progress };
  }, [basket, requiredCanonicalIds]);
  
  if (requiredCanonicalIds.length === 0) return null;
  
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3">Degree Requirements</h3>
      
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{audit.satisfied.length} / {requiredCanonicalIds.length}</span>
        </div>
        <Progress value={audit.progress} className="h-2" />
      </div>
      
      <div className="space-y-2">
        {audit.satisfied.map(id => (
          <div key={id} className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-400">{id}</span>
          </div>
        ))}
        
        {audit.unmet.map(id => (
          <div key={id} className="flex items-center gap-2 text-sm">
            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{id}</span>
          </div>
        ))}
      </div>
      
      {audit.unmet.length > 0 && (
        <div className="mt-4 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Clock className="h-3 w-3 inline mr-1" />
          {audit.unmet.length} requirement(s) remaining
        </div>
      )}
    </Card>
  );
}
