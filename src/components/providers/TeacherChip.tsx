import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User,
  Star,
  MessageSquare,
  Award,
  TrendingUp
} from 'lucide-react';
import type { Teacher } from '@/types/institutions';

interface TeacherChipProps {
  teacherId: string;
  variant?: 'default' | 'compact';
  showRating?: boolean;
  showReviews?: boolean;
}

export function TeacherChip({ 
  teacherId, 
  variant = 'default',
  showRating = true,
  showReviews = true 
}: TeacherChipProps) {
  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          institution:institutions(*)
        `)
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      return data as Teacher;
    },
    enabled: !!teacherId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-4 h-4 bg-muted rounded-full" />
        <div className="w-24 h-4 bg-muted rounded" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <Badge variant="outline" className="text-xs">
        <User className="w-3 h-3 mr-1" />
        Unknown Teacher
      </Badge>
    );
  }

  const getVerificationBadge = () => {
    switch (teacher.verification_status) {
      case 'expert':
        return <Award className="w-3 h-3 text-yellow-500" />;
      case 'verified':
        return <Award className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="w-4 h-4">
          <AvatarImage src={teacher.profile_image_url} alt={teacher.name} />
          <AvatarFallback className="text-xs">
            {teacher.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium truncate">{teacher.name}</span>
        {showRating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
            <span className="text-xs">{teacher.average_rating.toFixed(1)}</span>
          </div>
        )}
        {getVerificationBadge()}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2 border border-border rounded-md bg-background">
      <Avatar className="w-8 h-8">
        <AvatarImage src={teacher.profile_image_url} alt={teacher.name} />
        <AvatarFallback className="text-sm">
          {teacher.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{teacher.name}</span>
          {getVerificationBadge()}
        </div>
        
        {teacher.title && (
          <p className="text-xs text-muted-foreground truncate">{teacher.title}</p>
        )}
        
        <div className="flex items-center gap-3 mt-1">
          {showRating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-xs font-medium">{teacher.average_rating.toFixed(1)}</span>
            </div>
          )}
          
          {showReviews && teacher.total_reviews > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{teacher.total_reviews}</span>
            </div>
          )}
          
          {teacher.outcome_score > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">{teacher.outcome_score}%</span>
            </div>
          )}
        </div>

        {teacher.specializations && teacher.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {teacher.specializations.slice(0, 2).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1">
                {spec}
              </Badge>
            ))}
            {teacher.specializations.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1">
                +{teacher.specializations.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}