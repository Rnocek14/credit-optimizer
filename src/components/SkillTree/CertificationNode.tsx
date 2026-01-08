import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Clock, DollarSign, Calendar, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CertificationNodeData {
  title: string;
  issuer: string;
  description: string;
  cost: string;
  validityYears: number;
  skillsValidated: string[];
  examDuration?: string;
  passingScore?: string;
  renewalRequired?: boolean;
  industryRecognition: 'high' | 'medium' | 'low';
  isEarned?: boolean;
  earnedDate?: Date;
  expiryDate?: Date;
  registrationUrl?: string;
}

interface CertificationNodeProps {
  data: CertificationNodeData;
  selected?: boolean;
  onRegister?: (certId: string) => void;
}

export const CertificationNode: React.FC<CertificationNodeProps> = memo(({ 
  data, 
  selected, 
  onRegister 
}) => {
  const {
    title,
    issuer,
    description,
    cost,
    validityYears,
    skillsValidated,
    examDuration,
    renewalRequired,
    industryRecognition,
    isEarned,
    earnedDate,
    expiryDate,
    registrationUrl
  } = data;

  const getRecognitionColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const isExpiringSoon = () => {
    if (!expiryDate || !isEarned) return false;
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  };

  const handleAction = () => {
    if (registrationUrl) {
      window.open(registrationUrl, '_blank');
    } else if (onRegister) {
      onRegister(title);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      
      <Card className={`
        w-80 p-4 transition-all duration-200 hover:shadow-lg
        ${isEarned 
          ? isExpiringSoon()
            ? 'border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950'
            : 'border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950'
          : 'border border-border hover:border-primary'
        }
        ${selected ? 'ring-2 ring-primary ring-inset' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-muted">
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {issuer}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRecognitionColor(industryRecognition)}`}
                >
                  {industryRecognition} recognition
                </Badge>
                {isEarned && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <Shield className="h-3 w-3 mr-1" />
                    Certified
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-base leading-tight mb-1">
              {title}
            </h3>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* Certification Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">
                {cost === 'Free' || cost === '0' ? 'Free' : cost}
              </p>
              <p className="text-xs text-muted-foreground">Exam Cost</p>
            </div>
          </div>

          {/* Validity */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">
                {validityYears === 0 ? 'Lifetime' : `${validityYears} years`}
              </p>
              <p className="text-xs text-muted-foreground">Valid for</p>
            </div>
          </div>
        </div>

        {/* Exam Details */}
        {examDuration && (
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Exam Duration: {examDuration}
            </span>
          </div>
        )}

        {/* Skills Validated */}
        {skillsValidated && skillsValidated.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Skills Validated:</p>
            <div className="flex flex-wrap gap-1">
              {skillsValidated.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                  {skill}
                </Badge>
              ))}
              {skillsValidated.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{skillsValidated.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Earned Status */}
        {isEarned && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <div className="space-y-2">
              {earnedDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Earned:</span>
                  <span className="font-medium">{formatDate(earnedDate)}</span>
                </div>
              )}
              {expiryDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className={`font-medium ${isExpiringSoon() ? 'text-yellow-600' : ''}`}>
                    {formatDate(expiryDate)}
                    {isExpiringSoon() && ' ⚠️'}
                  </span>
                </div>
              )}
              {renewalRequired && isExpiringSoon() && (
                <p className="text-xs text-yellow-600 mt-2">
                  Renewal required soon
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant={isEarned ? 'outline' : 'default'}
          size="sm" 
          className="w-full text-sm"
          onClick={handleAction}
        >
          {isEarned ? (
            isExpiringSoon() ? (
              'Renew Certification'
            ) : (
              'View Certificate'
            )
          ) : (
            registrationUrl ? (
              <>
                Register for Exam
                <ExternalLink className="h-3 w-3 ml-1" />
              </>
            ) : (
              'Learn More'
            )
          )}
        </Button>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Industry Value: {industryRecognition}</span>
            {renewalRequired && !isEarned && (
              <span>Renewal required</span>
            )}
          </div>
        </div>
      </Card>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

CertificationNode.displayName = 'CertificationNode';