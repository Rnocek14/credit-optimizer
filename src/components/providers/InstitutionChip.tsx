import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2,
  GraduationCap,
  Monitor,
  Briefcase,
  Award,
  Star
} from 'lucide-react';
import type { Institution } from '@/types/institutions';

interface InstitutionChipProps {
  institutionId: string;
  variant?: 'default' | 'compact';
  showRating?: boolean;
}

const getInstitutionIcon = (type?: string) => {
  switch (type) {
    case 'university': return GraduationCap;
    case 'bootcamp': return Monitor;
    case 'online_platform': return Monitor;
    case 'employer': return Briefcase;
    case 'certification_body': return Award;
    default: return Building2;
  }
};

const getTypeLabel = (type?: string) => {
  switch (type) {
    case 'university': return 'University';
    case 'bootcamp': return 'Bootcamp';
    case 'online_platform': return 'Online';
    case 'employer': return 'Corporate';
    case 'certification_body': return 'Certification';
    default: return 'Institution';
  }
};

export function InstitutionChip({ 
  institutionId, 
  variant = 'default',
  showRating = true 
}: InstitutionChipProps) {
  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .single();

      if (error) throw error;
      return data as Institution;
    },
    enabled: !!institutionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-4 h-4 bg-muted rounded-full" />
        <div className="w-20 h-4 bg-muted rounded" />
      </div>
    );
  }

  if (!institution) {
    return (
      <Badge variant="outline" className="text-xs">
        <Building2 className="w-3 h-3 mr-1" />
        Unknown Institution
      </Badge>
    );
  }

  const Icon = getInstitutionIcon(institution.type);
  const typeLabel = getTypeLabel(institution.type);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {institution.logo_url ? (
          <Avatar className="w-4 h-4">
            <AvatarImage src={institution.logo_url} alt={institution.name} />
            <AvatarFallback className="text-xs">
              <Icon className="w-2 h-2" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Icon className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium truncate">{institution.name}</span>
        {showRating && (
          <Badge variant="secondary" className="text-xs px-1">
            {institution.reputation_score}/100
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 border border-border rounded-md bg-background">
      {institution.logo_url ? (
        <Avatar className="w-6 h-6">
          <AvatarImage src={institution.logo_url} alt={institution.name} />
          <AvatarFallback className="text-xs">
            <Icon className="w-3 h-3" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <Icon className="w-6 h-6 text-muted-foreground" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{institution.name}</span>
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
        </div>
        
        {showRating && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs text-muted-foreground">
              {institution.reputation_score}/100
            </span>
            <Badge 
              variant={institution.verification_status === 'verified' ? 'default' : 'secondary'}
              className="text-xs ml-2"
            >
              {institution.verification_status}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}