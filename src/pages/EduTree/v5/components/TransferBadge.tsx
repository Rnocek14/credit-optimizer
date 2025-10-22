import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExternalLink, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { useTransferRule } from '../utils/useTransferRule';

export function TransferBadge({
  courseCode,
  providerCode,
  providerType,
}: {
  courseCode: string;
  providerCode: string;
  providerType?: 'university' | 'mooc' | 'testing_center' | 'bootcamp' | string;
}) {
  const { constraints } = usePlanBasket();
  const target = constraints.target_school;

  const { data: rule, isLoading } = useTransferRule(providerCode, courseCode, target);

  if (!target) return null;

  // If the course is from the target institution, it's in-residence (no transfer needed)
  if (providerCode?.toUpperCase() === target?.toUpperCase()) {
    return (
      <Badge className="gap-1 border cursor-pointer bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700">
        <CheckCircle className="h-4 w-4" />
        In-residence
      </Badge>
    );
  }

  const fallback = () => {
    switch (providerType) {
      case 'university':
      case 'testing_center':
        return { cls: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-4 w-4" />, label: 'Likely transfers' };
      case 'mooc':
        return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="h-4 w-4" />, label: 'Case-by-case' };
      case 'bootcamp':
        return { cls: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="h-4 w-4" />, label: 'May not transfer' };
      default:
        return { cls: 'bg-gray-100 text-gray-700 border-gray-300', icon: <HelpCircle className="h-4 w-4" />, label: 'Unknown' };
    }
  };

  const status = (() => {
    if (isLoading) return { cls: 'bg-gray-100 text-gray-600 border-gray-300', icon: <HelpCircle className="h-4 w-4" />, label: 'Checking…' };
    if (!rule) return fallback();

    switch (rule.acceptance_status) {
      case 'accepted':
        return { cls: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-4 w-4" />, label: `Transfers as ${rule.target_course_code ?? 'Course'}` };
      case 'elective':
        return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="h-4 w-4" />, label: 'Transfers as Elective' };
      case 'rejected':
        return { cls: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="h-4 w-4" />, label: 'Does not transfer' };
      default:
        return fallback();
    }
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge className={`gap-1 border cursor-pointer ${status.cls}`}>{status.icon}{status.label}</Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <div className="font-medium">Transfer Details</div>
          <div className="text-sm">
            Target: <span className="font-mono">{target}</span>
          </div>
          {rule ? (
            <>
              <div className="text-sm">Maps as: <span className="font-mono">{rule.target_course_code ?? 'Elective'}</span></div>
              <div className="text-xs text-muted-foreground">
                Source: {rule.source_institution} • {rule.source_course_code}
              </div>
              <div className="text-xs text-muted-foreground">
                Evidence: {rule.rule_source ?? '—'} • {rule.confidence != null ? `${Math.round(rule.confidence * 100)}%` : '—'}
              </div>
              {rule.evidence_url && (
                <a className="inline-flex items-center gap-1 text-xs underline" href={rule.evidence_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" /> View
                </a>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">No explicit rule found • Showing heuristic.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
