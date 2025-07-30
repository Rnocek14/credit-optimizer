import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Award, CheckCircle, XCircle, Search } from "lucide-react";
import { useWorkflowCertificates } from "@/hooks/useWorkflowCertificates";
import { formatDistanceToNow } from "date-fns";

export default function VerifySignature() {
  const { code } = useParams();
  const [verificationCode, setVerificationCode] = useState(code || "");
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const { verifyCertificate } = useWorkflowCertificates();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Certificate Verification
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Verify the authenticity of Maya AI certificates and credentials
            </p>
          </div>

          {/* Verification Form */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Search className="h-5 w-5" />
                Verify Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Certificate Verification Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="verification-code"
                    placeholder="Enter 12-character verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    className="font-mono text-center"
                    maxLength={12}
                  />
                  <Button 
                    onClick={handleVerification}
                    disabled={!verificationCode.trim() || verifying}
                    className="px-8"
                  >
                    {verifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {verificationResult !== null && (
            <Card className="border-2">
              <CardContent className="pt-6">
                {verificationResult ? (
                  <div className="space-y-6">
                    {/* Valid Certificate */}
                    <div className="flex items-center gap-3 text-green-600">
                      <CheckCircle className="h-8 w-8" />
                      <div>
                        <h3 className="text-2xl font-bold">Certificate Verified</h3>
                        <p className="text-muted-foreground">This certificate is authentic and valid</p>
                      </div>
                    </div>

                    {/* Certificate Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Certificate Information</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Certificate Number:</span>
                            <p className="font-mono">{verificationResult.certificate_number}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Workflow:</span>
                            <p className="font-semibold">{verificationResult.workflow_title}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Certificate Type:</span>
                            <Badge variant="secondary" className="ml-2">
                              {verificationResult.certificate_type}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Issued:</span>
                            <p>{formatDistanceToNow(new Date(verificationResult.issued_at), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Performance Metrics</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Maya Confidence Score:</span>
                            <p className="font-semibold">{Math.round(verificationResult.maya_confidence_score)}%</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Total Decisions:</span>
                            <p>{verificationResult.total_decisions}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Autonomous Steps:</span>
                            <p>{verificationResult.autonomous_steps}</p>
                          </div>
                          {verificationResult.user_feedback_score && (
                            <div>
                              <span className="text-sm text-muted-foreground">User Rating:</span>
                              <p>{verificationResult.user_feedback_score}/5 ⭐</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {verificationResult.workflow_description && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Workflow Description</h4>
                        <p className="text-muted-foreground">{verificationResult.workflow_description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3 text-destructive">
                      <XCircle className="h-8 w-8" />
                      <div>
                        <h3 className="text-2xl font-bold">Certificate Not Found</h3>
                        <p className="text-muted-foreground">
                          The verification code is invalid or the certificate may have been revoked
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* About Maya Certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                About Maya Certificates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Maya AI certificates are issued to users who successfully complete autonomous workflows 
                with high confidence scores and positive outcomes. These certificates serve as verified 
                credentials of AI-guided career development achievements.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-semibold">Trust & Verification</h5>
                  <p className="text-muted-foreground">
                    Each certificate includes a unique verification code and cannot be forged
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold">Performance Metrics</h5>
                  <p className="text-muted-foreground">
                    Certificates include detailed performance data and user feedback scores
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold">Blockchain Security</h5>
                  <p className="text-muted-foreground">
                    Powered by secure cryptographic verification for maximum authenticity
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}