import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { pdf } from '@react-pdf/renderer';
import { CertificatePDF } from './CertificatePDFTemplate';
import { 
  Award, 
  Download, 
  ExternalLink, 
  Shield, 
  CheckCircle,
  Clock,
  Star,
  Brain,
  Users,
  Share2
} from 'lucide-react';

interface WorkflowCertificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  certificate_type: string;
  issued_at: string;
  workflow_title: string;
  workflow_description: string;
  completion_date: string;
  maya_confidence_score: number;
  user_feedback_score: number;
  total_decisions: number;
  autonomous_steps: number;
  manual_steps: number;
  certificate_data: any;
}

interface WorkflowCertificateManagerProps {
  workflowId: string;
  workflowTitle: string;
  workflowStatus: string;
  completedAt?: string;
  mayaDecisions: any[];
  workflowSteps: any[];
}

export function WorkflowCertificateManager({
  workflowId,
  workflowTitle,
  workflowStatus,
  completedAt,
  mayaDecisions,
  workflowSteps
}: WorkflowCertificateManagerProps) {
  const [certificate, setCertificate] = useState<WorkflowCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkCertificateStatus();
    calculateEligibility();
  }, [workflowId, workflowStatus, mayaDecisions, workflowSteps]);

  const checkCertificateStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_certificates')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('is_revoked', false)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking certificate:', error);
        return;
      }

      setCertificate(data);
    } catch (error) {
      console.error('Error checking certificate status:', error);
    }
  };

  const calculateEligibility = () => {
    if (workflowStatus !== 'completed') {
      setIsEligible(false);
      return;
    }

    const totalDecisions = mayaDecisions.length;
    const avgConfidence = totalDecisions > 0 
      ? mayaDecisions.reduce((sum, d) => sum + d.confidence_score, 0) / totalDecisions 
      : 0;

    const userFeedbackDecisions = mayaDecisions.filter(d => d.user_feedback_rating);
    const avgUserRating = userFeedbackDecisions.length > 0
      ? userFeedbackDecisions.reduce((sum, d) => sum + (d.user_feedback_rating || 0), 0) / userFeedbackDecisions.length
      : 0;

    const autonomousSteps = workflowSteps?.filter(s => s.is_autonomous).length || 0;

    const eligibilityMetrics = {
      workflowCompleted: workflowStatus === 'completed',
      minConfidence: avgConfidence >= 0.75,
      minUserRating: avgUserRating >= 3.5 || userFeedbackDecisions.length === 0,
      minDecisions: totalDecisions >= 3,
      avgConfidence: avgConfidence * 100,
      avgUserRating,
      totalDecisions,
      autonomousSteps
    };

    setMetrics(eligibilityMetrics);
    setIsEligible(Object.values({
      workflowCompleted: eligibilityMetrics.workflowCompleted,
      minConfidence: eligibilityMetrics.minConfidence,
      minUserRating: eligibilityMetrics.minUserRating,
      minDecisions: eligibilityMetrics.minDecisions
    }).every(Boolean));
  };

  const generateCertificate = async () => {
    try {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-workflow-certificate', {
        body: {
          workflowId,
          userId: user.user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setCertificate(data.certificate);
        toast({
          title: "Certificate Generated!",
          description: `Your "Trusted by Maya" certificate has been created for ${workflowTitle}`,
        });
      } else {
        throw new Error(data.error || 'Failed to generate certificate');
      }
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      toast({
        title: "Certificate Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificatePDF = async () => {
    if (!certificate) return;
    
    try {
      // Generate PDF using @react-pdf/renderer
      const pdfDoc = <CertificatePDF 
        certificate={certificate} 
        userName="Certificate Holder" // You can get actual user name from context/props
      />;
      const blob = await pdf(pdfDoc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maya-certificate-${certificate.certificate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to JSON download
      const certificateInfo = {
        certificateNumber: certificate?.certificate_number,
        verificationCode: certificate?.verification_code,
        workflowTitle: certificate?.workflow_title,
        issuedAt: certificate?.issued_at,
        completionDate: certificate?.completion_date,
        mayaConfidenceScore: certificate?.maya_confidence_score,
        autonomousSteps: certificate?.autonomous_steps
      };

      const blob = new Blob([JSON.stringify(certificateInfo, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maya-certificate-${certificate?.certificate_number}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const shareToLinkedIn = () => {
    if (!certificate) return;
    
    const text = encodeURIComponent(
      `🏆 Just earned my Maya Certified credential for completing "${certificate.workflow_title}"! ` +
      `Achieved ${Math.round(certificate.maya_confidence_score * 100)}% Maya confidence score through ` +
      `${certificate.total_decisions} AI-guided decisions. Verify at: ${window.location.origin}/verify/${certificate.verification_code}`
    );
    
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
  };

  const getEligibilityColor = (requirement: boolean) => {
    return requirement ? 'text-success' : 'text-destructive';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 75) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (workflowStatus !== 'completed' && !certificate) {
    return null; // Don't show certificate manager for incomplete workflows
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Trusted by Maya Certificate
        </CardTitle>
        <CardDescription>
          Professional certification for AI-guided workflow completion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {certificate ? (
          // Certificate already exists
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Certificate Awarded</h3>
                  <p className="text-sm text-yellow-700">
                    Certificate #{certificate.certificate_number}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Maya Certified
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-card rounded-lg">
                <div className="text-lg font-bold text-primary">{certificate.maya_confidence_score * 100}%</div>
                <div className="text-xs text-muted-foreground">Maya Confidence</div>
              </div>
              <div className="p-3 bg-card rounded-lg">
                <div className="text-lg font-bold text-primary">{certificate.total_decisions}</div>
                <div className="text-xs text-muted-foreground">AI Decisions</div>
              </div>
              <div className="p-3 bg-card rounded-lg">
                <div className="text-lg font-bold text-primary">{certificate.autonomous_steps}</div>
                <div className="text-xs text-muted-foreground">Auto Steps</div>
              </div>
              <div className="p-3 bg-card rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {certificate.user_feedback_score ? certificate.user_feedback_score.toFixed(1) : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">User Rating</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadCertificatePDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={shareToLinkedIn}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on LinkedIn
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/verify/${certificate.verification_code}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Public Verification
              </Button>
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
              <strong>Verification Code:</strong> {certificate.verification_code}<br />
              <strong>Issued:</strong> {new Date(certificate.issued_at).toLocaleDateString()}
            </div>
          </div>
        ) : isEligible ? (
          // Eligible for certificate
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Certificate Eligible</h3>
                  <p className="text-sm text-green-700">
                    This workflow qualifies for Maya certification
                  </p>
                </div>
              </div>
              <Button onClick={generateCertificate} disabled={loading} size="sm">
                {loading ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                Generate Certificate
              </Button>
            </div>

            {metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-card rounded-lg">
                  <div className={`text-lg font-bold ${getConfidenceColor(metrics.avgConfidence)}`}>
                    {metrics.avgConfidence.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Maya Confidence</div>
                </div>
                <div className="p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">{metrics.totalDecisions}</div>
                  <div className="text-xs text-muted-foreground">AI Decisions</div>
                </div>
                <div className="p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">{metrics.autonomousSteps}</div>
                  <div className="text-xs text-muted-foreground">Auto Steps</div>
                </div>
                <div className="p-3 bg-card rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {metrics.avgUserRating ? metrics.avgUserRating.toFixed(1) : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">User Rating</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Not eligible - show requirements
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-gray-700">Certificate Requirements</h3>
                  <p className="text-sm text-gray-600">
                    Complete the requirements below to earn your certificate
                  </p>
                </div>
              </div>

              {metrics && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={getEligibilityColor(metrics.workflowCompleted)}>
                      ✓ Workflow completed
                    </span>
                    <Badge variant={metrics.workflowCompleted ? "default" : "secondary"}>
                      {metrics.workflowCompleted ? "Met" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={getEligibilityColor(metrics.minConfidence)}>
                      Maya confidence ≥75% (currently {metrics.avgConfidence.toFixed(1)}%)
                    </span>
                    <Badge variant={metrics.minConfidence ? "default" : "secondary"}>
                      {metrics.minConfidence ? "Met" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={getEligibilityColor(metrics.minDecisions)}>
                      Minimum 3 Maya decisions (currently {metrics.totalDecisions})
                    </span>
                    <Badge variant={metrics.minDecisions ? "default" : "secondary"}>
                      {metrics.minDecisions ? "Met" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={getEligibilityColor(metrics.minUserRating)}>
                      User rating ≥3.5 or no feedback (currently {metrics.avgUserRating ? metrics.avgUserRating.toFixed(1) : 'N/A'})
                    </span>
                    <Badge variant={metrics.minUserRating ? "default" : "secondary"}>
                      {metrics.minUserRating ? "Met" : "Pending"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}