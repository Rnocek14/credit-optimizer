/**
 * V6 Degree Selector — Quick-switch dropdown for returning users.
 * Fetches available templates from the marketplace hook and lets users
 * switch templateId without leaving the page.
 */

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap } from 'lucide-react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';

interface V6DegreeSelectorProps {
  currentTemplateId: string | null;
  onDegreeChange: (templateId: string) => void;
}

export function V6DegreeSelector({ currentTemplateId, onDegreeChange }: V6DegreeSelectorProps) {
  const { data: templates, isLoading } = useMarketplaceTemplates();

  const options = useMemo(() => {
    if (!templates?.length) return [];
    return templates.map(t => ({
      id: t.id,
      label: t.marketplace?.title || `${t.anchorSchool ?? ''} ${t.optimization ?? ''}`.trim() || t.id,
    }));
  }, [templates]);

  if (isLoading || options.length === 0) return null;

  return (
    <Select value={currentTemplateId ?? ''} onValueChange={onDegreeChange}>
      <SelectTrigger className="w-[220px] h-9 text-sm gap-2">
        <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <SelectValue placeholder="Select Degree" />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
