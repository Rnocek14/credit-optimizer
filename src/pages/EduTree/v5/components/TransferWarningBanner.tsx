import { usePlanBasket } from '../state/usePlanBasket';

export function TransferWarningBanner({ onShowAlternatives }: { onShowAlternatives?: (violations: any[]) => void }) {
  const { items, constraints } = usePlanBasket();
  const target = constraints.target_school;

  // Placeholder: After migrations run and transfer_rules are populated,
  // this will query and show transfer violations
  // For now, return null to avoid type errors
  
  return null;
}
