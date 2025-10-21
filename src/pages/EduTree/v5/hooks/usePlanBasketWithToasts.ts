import { usePlanBasket, type BasketItem } from "../state/usePlanBasket";
import { toast } from "sonner";
import { logEvent } from "@/lib/analytics";

/**
 * Centralized wrapper for plan basket operations with toast notifications and undo
 */
export function usePlanBasketWithToasts() {
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);
  const basket = usePlanBasket(s => s.items);

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
    removeItemWithToast,
  };
}
