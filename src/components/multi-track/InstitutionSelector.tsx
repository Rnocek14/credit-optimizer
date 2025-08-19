import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, Star, GraduationCap, Briefcase, Monitor, Award } from 'lucide-react';
import { useInstitutions } from '@/hooks/useInstitutions';
import type { Institution } from '@/types/institutions';

interface InstitutionSelectorProps {
  value?: string;
  onValueChange: (institutionId: string) => void;
  placeholder?: string;
  filterByType?: string;
}

const getInstitutionIcon = (type: string) => {
  switch (type) {
    case 'university':
      return <GraduationCap className="h-4 w-4" />;
    case 'bootcamp':
      return <Monitor className="h-4 w-4" />;
    case 'online_platform':
      return <Monitor className="h-4 w-4" />;
    case 'employer':
      return <Briefcase className="h-4 w-4" />;
    case 'certification_body':
      return <Award className="h-4 w-4" />;
    default:
      return <Building className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'university':
      return 'University';
    case 'bootcamp':
      return 'Bootcamp';
    case 'online_platform':
      return 'Online Platform';
    case 'employer':
      return 'Employer';
    case 'certification_body':
      return 'Certification Body';
    default:
      return type;
  }
};

export function InstitutionSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select institution...",
  filterByType 
}: InstitutionSelectorProps) {
  const { data: institutions = [], isLoading } = useInstitutions();

  const filteredInstitutions = filterByType 
    ? institutions.filter(inst => inst.type === filterByType)
    : institutions;

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading institutions..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredInstitutions.map((institution) => (
          <SelectItem key={institution.id} value={institution.id}>
            <div className="flex items-center gap-3 w-full">
              {getInstitutionIcon(institution.type)}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{institution.name}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(institution.type)}
                  </Badge>
                  {institution.reputation_score > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span>{institution.reputation_score.toFixed(1)}</span>
                    </div>
                  )}
                  {institution.verification_status === 'verified' && (
                    <Badge variant="default" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}