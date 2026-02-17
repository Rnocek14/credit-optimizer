/**
 * UnassignedBucket — Shows courses added to plan without a module/requirement.
 *
 * These come from "Add to EduTree" actions where requirementId was missing.
 * Users can later drag them into specific modules.
 */

import { usePlanBasket, type BasketItem } from '../state/usePlanBasket';
import { X, GripVertical, PackageOpen } from 'lucide-react';
import { usePlanBasketWithToasts } from '../hooks/usePlanBasketWithToasts';

const UNASSIGNED_MODULE_ID = '__unassigned__';

export function UnassignedBucket() {
  const items = usePlanBasket(s => s.items);
  const { removeItemWithToast } = usePlanBasketWithToasts();

  const unassignedItems = items.filter(
    i => i.moduleId === UNASSIGNED_MODULE_ID || !i.moduleId
  );

  if (unassignedItems.length === 0) return null;

  const totalCredits = unassignedItems.reduce((s, i) => s + i.credits, 0);

  return (
    <div className="rounded-lg border border-dashed border-accent bg-accent/5 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <PackageOpen className="h-4 w-4 text-accent-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Unassigned Courses
        </h3>
        <span className="text-xs text-muted-foreground">
          {unassignedItems.length} course{unassignedItems.length !== 1 ? 's' : ''} · {totalCredits} credits
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Drag these into a module to assign them to a requirement.
      </p>
      <div className="space-y-2">
        {unassignedItems.map((item) => (
          <div
            key={item.optionId || item.courseId}
            className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {item.title || item.courseId}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.credits} credits
                {item.providerCode && <span> · {item.providerCode}</span>}
              </div>
            </div>
            <button
              onClick={() => removeItemWithToast(item.optionId || item.courseId)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove from plan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
