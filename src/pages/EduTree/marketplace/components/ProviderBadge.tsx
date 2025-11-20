import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Building2, GraduationCap, BookOpen, ClipboardCheck } from 'lucide-react';

type ProviderCode = 'SOPHIA' | 'STUDYCOM' | 'CLEP' | 'TESU' | 'COSC' | 'WGU' | 'UMGC' | 'EXCELSIOR';

interface ProviderBadgeProps {
  providerCode: ProviderCode;
  className?: string;
  showIcon?: boolean;
}

const PROVIDER_CONFIG = {
  SOPHIA: {
    label: 'Sophia',
    className: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
    icon: BookOpen,
  },
  STUDYCOM: {
    label: 'Study.com',
    className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
    icon: BookOpen,
  },
  CLEP: {
    label: 'CLEP',
    className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
    icon: ClipboardCheck,
  },
  TESU: {
    label: 'TESU',
    className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    icon: GraduationCap,
  },
  COSC: {
    label: 'COSC',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800',
    icon: GraduationCap,
  },
  WGU: {
    label: 'WGU',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800',
    icon: GraduationCap,
  },
  UMGC: {
    label: 'UMGC',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
    icon: GraduationCap,
  },
  EXCELSIOR: {
    label: 'Excelsior',
    className: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800',
    icon: GraduationCap,
  },
} as const;

export function ProviderBadge({ providerCode, className, showIcon = true }: ProviderBadgeProps) {
  const config = PROVIDER_CONFIG[providerCode];
  
  if (!config) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Building2 className="h-3 w-3" />
        {providerCode}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1 font-medium', config.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

export type { ProviderCode };
export { PROVIDER_CONFIG };
