import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
// HubNavigation now provided by AppShell at route level
import { useCertificateEngine } from '@/hooks/useCertificateEngine';
import { useQuery } from '@tanstack/react-query';
import { 
  Award, 
  ExternalLink, 
  Calendar,
  Brain,
  Users,
  Star,
  Zap,
  TrendingUp,
  Shield,
  Download,
  Copy,
  Plus,
  Check,
  X
} from 'lucide-react';

interface PublicCertificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  workflow_title: string;
  issued_at: string;
  completion_date: string;
  maya_confidence_score: number;
  user_feedback_score?: number;
  total_decisions: number;
  autonomous_steps: number;
  certificate_type: string;
}

export default function CertificateGallery() {
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Use certificate engine
  const { 
    certificates, 
    totalCount, 
    verifiedCount, 
    isLoading, 
    isGenerating, 
    isVerifying,
    generateCertificate, 
    verifyCertificate,
    verificationResult 
  } = useCertificateEngine(user?.id);

  // Get public certificates for gallery display
  const [publicCertificates, setPublicCertificates] = useState<PublicCertificate[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCertificates: 0,
    avgConfidence: 0,
    totalDecisions: 0,
    recentCount: 0
  });

  useEffect(() => {
    fetchPublicCertificates();
  }, []);

  const fetchPublicCertificates = async () => {
    try {
      setPublicLoading(true);
      
      // Fetch recent certificates (last 30 days) for public display
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('workflow_certificates')
        .select(`
          id,
          certificate_number,
          verification_code,
          workflow_title,
          issued_at,
          completion_date,
          maya_confidence_score,
          user_feedback_score,
          total_decisions,
          autonomous_steps,
          certificate_type
        `)
        .eq('is_revoked', false)
        .gte('issued_at', thirtyDaysAgo.toISOString())
        .order('issued_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setPublicCertificates(data || []);
      
      // Calculate stats
      const totalCertificates = data?.length || 0;
      const avgConfidence = totalCertificates > 0 
        ? (data?.reduce((sum, cert) => sum + cert.maya_confidence_score, 0) || 0) / totalCertificates
        : 0;
      const totalDecisions = data?.reduce((sum, cert) => sum + cert.total_decisions, 0) || 0;
      
      setStats({
        totalCertificates,
        avgConfidence,
        totalDecisions,
        recentCount: totalCertificates
      });
    } catch (error) {
      console.error('Error fetching public certificates:', error);
    } finally {
      setPublicLoading(false);
    }
  };

  const handleGenerateTestCertificate = async () => {
    if (!user) return;
    
    try {
      await generateCertificate({
        certificateType: 'workflow_completion',
        certificateData: {
          title: 'Demo Workflow Completion',
          description: 'Successfully completed a demo Maya workflow',
          skills: ['Problem Solving', 'AI Collaboration'],
          metadata: { demo: true }
        }
      });
      setShowGenerateDialog(false);
    } catch (error) {
      console.error('Error generating test certificate:', error);
    }
  };

  const handleVerifyCertificate = async () => {
    if (!verificationCode.trim()) return;
    
    try {
      await verifyCertificate(verificationCode.trim());
    } catch (error) {
      console.error('Error verifying certificate:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (publicLoading || isLoading) {
    return (
      <>
        
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading certificate gallery...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Award className="w-8 h-8 text-yellow-500" />
            Maya Certificate Gallery
          </h1>
          <p className="text-muted-foreground">
            Discover recent Maya-certified achievements from our community
          </p>
        </div>

        {/* Stats Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Community Achievements (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.recentCount}</div>
                <div className="text-sm text-yellow-700">New Certificates</div>
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
                <div className="text-2xl font-bold text-purple-600">
                  {publicCertificates.reduce((sum, cert) => sum + cert.autonomous_steps, 0)}
                </div>
                <div className="text-sm text-purple-700">Autonomous Steps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recently Certified</h2>
            <div className="flex gap-2">
              {user && (
                <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Test Certificate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate Test Certificate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        This will generate a demo certificate for testing purposes.
                      </p>
                      <Button 
                        onClick={handleGenerateTestCertificate} 
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? 'Generating...' : 'Generate Certificate'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Verify Certificate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Verification Code</label>
                      <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter verification code"
                        className="mt-1"
                      />
                    </div>
                    
                    {verificationResult && (
                      <div className={`p-3 rounded-lg border ${
                        verificationResult.valid 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {verificationResult.valid ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`font-medium ${
                            verificationResult.valid ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {verificationResult.valid ? 'Valid Certificate' : 'Invalid Certificate'}
                          </span>
                        </div>
                        {verificationResult.valid && verificationResult.certificate && (
                          <div className="text-sm space-y-1">
                            <p><strong>Title:</strong> {verificationResult.certificate.title}</p>
                            <p><strong>Type:</strong> {verificationResult.certificate.type}</p>
                            <p><strong>Issued:</strong> {new Date(verificationResult.certificate.issueDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleVerifyCertificate} 
                      disabled={isVerifying || !verificationCode.trim()}
                      className="w-full"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* User's Personal Certificates */}
          {user && certificates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Your Certificates</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {certificates.map((certificate) => (
                  <Card key={certificate.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{certificate.title}</CardTitle>
                        <Badge variant="outline" className="bg-primary/10">
                          {certificate.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        #{certificate.certificateNumber}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Verification Code:</span>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1 rounded">
                              {certificate.verificationCode}
                            </code>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => copyToClipboard(certificate.verificationCode)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Issued:</span>
                          <span>{new Date(certificate.issueDate).toLocaleDateString()}</span>
                        </div>
                        
                        {certificate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {certificate.skills.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {certificate.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{certificate.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Public Gallery */}
          <h3 className="text-lg font-semibold mb-4">Public Gallery</h3>
          
          {publicCertificates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Recent Certificates</h3>
                <p className="text-gray-500 mb-4">
                  Be the first to earn a Maya certificate this month!
                </p>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Start a Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {publicCertificates.map((certificate) => (
                <Card key={certificate.id} className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Award className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-2">{certificate.workflow_title}</CardTitle>
                        <CardDescription className="text-xs">
                          #{certificate.certificate_number}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-card rounded-lg">
                        <Brain className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-sm font-bold">{((certificate.maya_confidence_score || 0) * 100).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                      </div>
                      <div className="text-center p-2 bg-card rounded-lg">
                        <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-sm font-bold">{certificate.total_decisions}</div>
                        <div className="text-xs text-muted-foreground">Decisions</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(certificate.issued_at).toLocaleDateString()}
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        Maya Certified
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="text-center py-8">
            <Award className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Earn Your Certificate?</h3>
            <p className="text-muted-foreground mb-4">
              Complete workflows with high Maya confidence to join our certified community
            </p>
            <div className="flex gap-2 justify-center">
              <Button>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Workflows
              </Button>
              <Button variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}