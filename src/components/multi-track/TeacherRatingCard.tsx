import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Users, Award, ExternalLink } from 'lucide-react';
import type { Teacher } from '@/types/institutions';

interface TeacherRatingCardProps {
  teacher: Teacher;
  showInstitution?: boolean;
  compact?: boolean;
  onViewProfile?: (teacher: Teacher) => void;
}

export function TeacherRatingCard({ 
  teacher, 
  showInstitution = true, 
  compact = false,
  onViewProfile 
}: TeacherRatingCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-500 text-yellow-500' 
            : i < rating 
            ? 'fill-yellow-300 text-yellow-300' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'expert':
        return <Badge className="bg-purple-100 text-purple-700">Expert</Badge>;
      case 'verified':
        return <Badge variant="default">Verified</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        {teacher.profile_image_url && (
          <img 
            src={teacher.profile_image_url} 
            alt={teacher.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{teacher.name}</h4>
            {getVerificationBadge(teacher.verification_status)}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {renderStars(teacher.average_rating)}
              <span className="ml-1">{teacher.average_rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{teacher.total_reviews.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {onViewProfile && (
          <Button variant="ghost" size="sm" onClick={() => onViewProfile(teacher)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {teacher.profile_image_url && (
            <img 
              src={teacher.profile_image_url} 
              alt={teacher.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{teacher.name}</h3>
                {getVerificationBadge(teacher.verification_status)}
              </div>
              {teacher.title && (
                <p className="text-muted-foreground">{teacher.title}</p>
              )}
              {showInstitution && teacher.institution && (
                <p className="text-sm text-muted-foreground">
                  at {teacher.institution.name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                {renderStars(teacher.average_rating)}
                <span className="font-medium">{teacher.average_rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({teacher.total_reviews.toLocaleString()} reviews)
                </span>
              </div>
              
              {teacher.outcome_score > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Award className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">
                    {teacher.outcome_score.toFixed(1)}% success rate
                  </span>
                </div>
              )}
            </div>

            {teacher.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {teacher.specializations.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {teacher.specializations.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{teacher.specializations.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {teacher.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {teacher.bio}
              </p>
            )}
          </div>

          {onViewProfile && (
            <Button variant="outline" onClick={() => onViewProfile(teacher)}>
              View Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}