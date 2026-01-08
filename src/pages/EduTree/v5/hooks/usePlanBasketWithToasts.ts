import { usePlanBasket, type BasketItem } from "../state/usePlanBasket";
import { toast } from "sonner";
import { logEvent } from "@/lib/analytics";
import { checkForDeadEnd, type RemainingModule } from "../engine/deadEndDetector";
import type { MarketplaceOption } from "../types/v5";

/**
 * Centralized wrapper for plan basket operations with toast notifications, undo, and dead-end guarding
 */
export function usePlanBasketWithToasts() {
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);

  const addItemWithToast = (item: BasketItem) => {
    addItem(item);
    
    toast.success("Added to plan", {
      description: `${item.courseId} (${item.credits}cr)`,
      action: {
        label: "Undo",
        onClick: () => {
          removeItem(item.courseId);
          toast.message("Removed");
          logEvent("plan_basket_undo_add", { courseId: item.courseId });
        },
      },
      duration: 5000,
    });
    
    logEvent("plan_basket_add", { 
      courseId: item.courseId, 
      credits: item.credits,
      status: item.status 
    });
  };

  /**
   * Add item with dead-end guard - blocks selections that would brick the degree
   * This is defense-in-depth: even if UI hides dead-ends, this blocks at selection time.
   */
  const addItemGuarded = (
    option: MarketplaceOption,
    moduleId: string,
    remainingModules: RemainingModule[]
  ): boolean => {
    // Check if this selection would create a dead-end
    const deadEndCheck = checkForDeadEnd(option, basket, constraints, remainingModules);
    
    if (deadEndCheck.isDeadEnd) {
      // Block with informative toast
      const primaryReason = deadEndCheck.reasons[0] || 'Would make degree completion impossible';
      
      toast.error('Selection Blocked', {
        description: primaryReason,
        duration: 6000,
      });
      
      logEvent("plan_basket_blocked_dead_end", {
        courseId: option.courseId,
        reason: primaryReason,
      });
      
      console.warn('[PlanBasket] Dead-end selection blocked:', {
        courseId: option.courseId,
        reasons: deadEndCheck.reasons,
        snapshot: deadEndCheck.snapshot,
      });
      
      return false;
    }
    
    // Selection allowed - create and add item
    const item: BasketItem = {
      moduleId,
      courseId: option.courseId,
      title: option.title ?? option.courseId,
      credits: option.credits ?? 0,
      cost_usd: option.cost_usd ?? 0,
      duration_weeks: option.duration_weeks ?? 8,
      workload_weekly_hours: option.workload_weekly_hours ?? (option.credits ? option.credits * 2.5 : 0),
      cri_score: option.cri_score ?? 0,
      providerType: option.providerType,
      status: 'pinned',
    };
    
    addItemWithToast(item);
    return true;
  };

  const removeItemWithToast = (courseId: string) => {
    const item = basket.find(i => i.courseId === courseId);
    removeItem(courseId);
    
    toast.message("Removed from plan", {
      action: item
        ? {
            label: "Undo",
            onClick: () => {
              addItem(item);
              toast.success("Restored");
              logEvent("plan_basket_undo_remove", { courseId });
            },
          }
        : undefined,
      duration: 5000,
    });
    
    logEvent("plan_basket_remove", { courseId });
    
    // Track if auto-filled item was removed
    if (item?.status === 'auto-filled') {
      logEvent("auto_fill_removed", { courseId });
    }
  };

  return {
    addItemWithToast,
    addItemGuarded,
    removeItemWithToast,
  };
}
