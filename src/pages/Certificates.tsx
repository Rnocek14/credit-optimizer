import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWorkflowCertificates } from '@/hooks/useWorkflowCertificates';
import { HubNavigation } from '@/components/HubNavigation';
import { 
  Award, 
  Download, 
  ExternalLink, 
  Shield, 
  Search,
  Calendar,
  TrendingUp,
  Brain,
  Users,
  Star,
  Zap
} from 'lucide-react';

export default function CertificatesPage() {
  const { 
    certificates, 
    loading, 
    fetchUserCertificates, 
    verifyCertificate,
    getCertificateStats 
  } = useWorkflowCertificates();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchUserCertificates();
  }, [fetchUserCertificates]);

  const handleVerification = async () => {
    if (!verificationCode.trim()) return;
    
    setVerifying(true);
    try {
      const result = await verifyCertificate(verificationCode);
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const downloadCertificate = (certificate: any) => {
    const certificateData = {
      certificateNumber: certificate.certificate_number,
      verificationCode: certificate.verification_code,
      workflowTitle: certificate.workflow_title,
      issuedAt: certificate.issued_at,
      completionDate: certificate.completion_date,
      mayaConfidenceScore: (certificate.maya_confidence_score * 100).toFixed(1) + '%',
      userFeedbackScore: certificate.user_feedback_score?.toFixed(1) || 'N/A',
      totalDecisions: certificate.total_decisions,
      autonomousSteps: certificate.autonomous_steps,
      manualSteps: certificate.manual_steps
    };

    const blob = new Blob([JSON.stringify(certificateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maya-certificate-${certificate.certificate_number}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = getCertificateStats();

  if (loading) {
    return (
      <>
        <HubNavigation />
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading certificates...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HubNavigation />
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Award className="w-8 h-8 text-yellow-500" />
            Maya Certificates
          </h1>
          <p className="text-muted-foreground">
            Professional certifications for AI-guided workflow completions
          </p>
        </div>

        {/* Stats Overview */}
        {certificates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Certification Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.total}</div>
                  <div className="text-sm text-yellow-700">Total Certificates</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{(stats.avgConfidence * 100).toFixed(1)}%</div>
                  <div className="text-sm text-green-700">Avg Maya Confidence</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDecisions}</div>
                  <div className="text-sm text-blue-700">Total AI Decisions</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalAutonomousSteps}</div>
                  <div className="text-sm text-purple-700">Autonomous Steps</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificate Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verify Certificate
            </CardTitle>
            <CardDescription>
              Enter a verification code to validate a Maya certificate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter verification code..."
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button onClick={handleVerification} disabled={verifying || !verificationCode.trim()}>
                <Search className="w-4 h-4 mr-2" />
                {verifying ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
            
            {verificationResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✓ Certificate Verified</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Certificate:</strong> {verificationResult.certificate_number}</p>
                  <p><strong>Workflow:</strong> {verificationResult.workflow_title}</p>
                  <p><strong>Issued:</strong> {new Date(verificationResult.issued_at).toLocaleDateString()}</p>
                  <p><strong>Maya Confidence:</strong> {(verificationResult.maya_confidence_score * 100).toFixed(1)}%</p>
                </div>
              </div>
            )}
            
            {verificationResult === null && verificationCode && !verifying && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">Certificate not found or verification code invalid</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Certificates</h2>
          
          {certificates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Certificates Yet</h3>
                <p className="text-gray-500 mb-4">
                  Complete workflows with high Maya confidence to earn certificates
                </p>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Workflows
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {certificates.map((certificate) => (
                <Card key={certificate.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Award className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{certificate.workflow_title}</CardTitle>
                          <CardDescription>
                            Certificate #{certificate.certificate_number}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Maya Certified
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-card rounded-lg">
                        <Brain className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-lg font-bold">{(certificate.maya_confidence_score * 100).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Maya Confidence</div>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg">
                        <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-lg font-bold">{certificate.total_decisions}</div>
                        <div className="text-xs text-muted-foreground">AI Decisions</div>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg">
                        <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-lg font-bold">{certificate.autonomous_steps}</div>
                        <div className="text-xs text-muted-foreground">Auto Steps</div>
                      </div>
                      <div className="text-center p-3 bg-card rounded-lg">
                        <Star className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-lg font-bold">
                          {certificate.user_feedback_score ? certificate.user_feedback_score.toFixed(1) : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">User Rating</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Issued {new Date(certificate.issued_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadCertificate(certificate)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                      <strong>Verification Code:</strong> {certificate.verification_code}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}