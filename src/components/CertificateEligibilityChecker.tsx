import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWorkflowCertificates } from '@/hooks/useWorkflowCertificates';
import { 
  Award, 
  Brain, 
  Users, 
  Target,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface CertificateEligibilityCheckerProps {
  workflowId: string;
  workflowTitle: string;
  workflowStatus: string;
  mayaDecisions: any[];
  workflowSteps: any[];
}

export function CertificateEligibilityChecker({
  workflowId,
  workflowTitle,
  workflowStatus,
  mayaDecisions,
  workflowSteps
}: CertificateEligibilityCheckerProps) {
  const { generateCertificate, getCertificatesByWorkflow } = useWorkflowCertificates();
  const [generating, setGenerating] = useState(false);

  // Calculate eligibility metrics
  const totalDecisions = mayaDecisions.length;
  const avgConfidence = totalDecisions > 0
    ? mayaDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / totalDecisions
    : 0;
  const userRatings = mayaDecisions.filter(d => d.user_feedback_rating);
  const avgUserRating = userRatings.length > 0
    ? userRatings.reduce((sum, d) => sum + d.user_feedback_rating, 0) / userRatings.length
    : 0;
  const autonomousSteps = workflowSteps.filter(s => s.is_autonomous && s.status === 'completed').length;

  // Define requirements
  const requirements = {
    isCompleted: workflowStatus === 'completed',
    minDecisions: totalDecisions >= 5,
    minConfidence: avgConfidence >= 0.7,
    minRating: avgUserRating >= 3.5 || userRatings.length === 0, // Allow if no ratings yet
    minAutonomous: autonomousSteps >= 3
  };

  const isEligible = Object.values(requirements).every(req => req);
  const existingCertificates = getCertificatesByWorkflow(workflowId);
  const alreadyCertified = existingCertificates.length > 0;

  const handleGenerateCertificate = async () => {
    setGenerating(true);
    try {
      await generateCertificate(workflowId);
    } catch (error) {
      console.error('Error generating certificate:', error);
    } finally {
      setGenerating(false);
    }
  };

  const getRequirementIcon = (met: boolean) => {
    return met ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getProgressPercentage = () => {
    const metRequirements = Object.values(requirements).filter(req => req).length;
    return (metRequirements / Object.keys(requirements).length) * 100;
  };

  if (alreadyCertified) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-800">
            <Award className="w-5 h-5" />
            <span className="font-medium">Certificate Already Issued</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            This workflow has already been certified. Check your certificates page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isEligible ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5" />
          Certificate Eligibility
        </CardTitle>
        <CardDescription>
          {isEligible 
            ? "🎉 This workflow qualifies for a Maya Certificate!" 
            : "Track your progress toward earning a certificate"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Certification Progress</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Requirements Checklist */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Requirements:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span>Workflow completed</span>
              <div className="flex items-center gap-2">
                {getRequirementIcon(requirements.isCompleted)}
                <span className={requirements.isCompleted ? 'text-green-600' : 'text-red-600'}>
                  {requirements.isCompleted ? 'Complete' : 'In Progress'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Maya decisions (5+ required)</span>
              <div className="flex items-center gap-2">
                {getRequirementIcon(requirements.minDecisions)}
                <span className={requirements.minDecisions ? 'text-green-600' : 'text-red-600'}>
                  {totalDecisions}/5
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Avg confidence (70%+ required)</span>
              <div className="flex items-center gap-2">
                {getRequirementIcon(requirements.minConfidence)}
                <span className={requirements.minConfidence ? 'text-green-600' : 'text-red-600'}>
                  {(avgConfidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Autonomous steps (3+ required)</span>
              <div className="flex items-center gap-2">
                {getRequirementIcon(requirements.minAutonomous)}
                <span className={requirements.minAutonomous ? 'text-green-600' : 'text-red-600'}>
                  {autonomousSteps}/3
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>User rating (3.5+ if provided)</span>
              <div className="flex items-center gap-2">
                {getRequirementIcon(requirements.minRating)}
                <span className={requirements.minRating ? 'text-green-600' : 'text-red-600'}>
                  {userRatings.length > 0 ? avgUserRating.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isEligible && (
          <Button 
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="w-full bg-yellow-600 hover:bg-yellow-700"
          >
            <Award className="w-4 h-4 mr-2" />
            {generating ? 'Generating Certificate...' : 'Generate Maya Certificate'}
          </Button>
        )}

        {!isEligible && (
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Continue using Maya to meet certification requirements
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}