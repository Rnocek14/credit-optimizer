import { useTransferRule } from '../utils/useTransferRule';
import { usePlanBasket } from '../state/usePlanBasket';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, ExternalLink } from 'lucide-react';
import * as React from 'react';

type Props = {
  providerCode?: string;
  providerType?: 'university' | 'mooc' | 'testing_center' | 'bootcamp' | string;
  courseCode: string; // marketplace_courses.code
};

export function TransferBadge({ providerCode, providerType, courseCode }: Props) {
  const { constraints } = usePlanBasket();
  const target = constraints.target_school;
  const { data: rule } = useTransferRule(providerCode, courseCode, target);

  if (!target) return null;

  const fallback = () => {
    switch (providerType) {
      case 'university': case 'testing_center':
        return { cls: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Likely transfers' };
      case 'mooc':
        return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Case-by-case' };
      case 'bootcamp':
        return { cls: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="h-3.5 w-3.5" />, label: 'May not transfer' };
      default:
        return { cls: 'bg-gray-100 text-gray-700 border-gray-300', icon: <HelpCircle className="h-3.5 w-3.5" />, label: 'Unknown' };
    }
  };

  const status = (() => {
    if (!rule) return fallback();
    switch (rule.acceptance_status) {
      case 'accepted':
        return { cls: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-3.5 w-3.5" />, label: `Transfers as ${rule.target_course_code ?? 'Course'}` };
      case 'elective':
        return { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Transfers as Elective' };
      case 'rejected':
        return { cls: 'bg-red-100 text-red-700 border-red-300', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Does not transfer' };
      default:
        return fallback();
    }
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge className={`cursor-pointer border ${status.cls} gap-1`}>
          {status.icon}
          <span className="text-xs">{status.label}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-80 text-sm">
        <div className="space-y-1">
          <div className="font-medium">Transfer Details</div>
          <div className="text-muted-foreground">
            Target: <span className="font-mono">{target}</span>
          </div>
          {rule ? (
            <>
              <div>Maps as: <span className="font-mono">{rule.target_course_code ?? 'Elective'}</span></div>
              <div>Source: <span className="font-mono">{rule.source_institution}</span> • <span className="font-mono">{rule.source_course_code}</span></div>
              <div>
                Evidence: {rule.rule_source ?? '—'} • {rule.confidence != null ? `${Math.round(rule.confidence * 100)}%` : '—'}
                {rule.evidence_url && (
                  <a className="inline-flex items-center gap-1 ml-2 underline" href={rule.evidence_url} target="_blank" rel="noreferrer">
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </>
          ) : (
            <div>No explicit rule found • Heuristic shown.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
