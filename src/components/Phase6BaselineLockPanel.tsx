import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Lock, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Archive,
  Award,
  Database,
  Zap
} from 'lucide-react';

interface Phase6BaselineLockPanelProps {
  userId: string;
}

export function Phase6BaselineLockPanel({ userId }: Phase6BaselineLockPanelProps) {
  const [isLocking, setIsLocking] = useState(false);
  const [lockResult, setLockResult] = useState<any>(null);
  const { toast } = useToast();

  const executeBaselineLock = async () => {
    setIsLocking(true);
    try {
      // Call the edge function to execute the baseline lock
      const { data, error } = await supabase.functions.invoke('phase6-baseline-lock', {
        body: { userId }
      });

      if (error) {
        throw error;
      }

      setLockResult(data.data);
      
      toast({
        title: "🔒 Phase 6 Baseline Locked",
        description: `Enterprise certification generated with ${data.data.certification.overallScore.toFixed(1)}% overall score`,
      });

    } catch (error: any) {
      console.error('Baseline lock error:', error);
      toast({
        title: "❌ Baseline Lock Failed",
        description: error.message || "Failed to lock Phase 6 baseline",
        variant: "destructive"
      });
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lock Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary to-primary-glow rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Phase 6 Baseline Lock Control</h3>
              <p className="text-muted-foreground">Lock enterprise-ready state as production baseline</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-primary" />
                <span className="font-medium">Baseline Snapshot</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Capture complete system state including metrics, workflows, and configurations
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-medium">Component Locks</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Lock all 6 Phase 6 components with validation scores and state preservation
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="font-medium">Enterprise Certification</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate enterprise-grade certification with compliance audit trail
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={executeBaselineLock} 
              disabled={isLocking}
              size="lg"
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              {isLocking ? (
                <>
                  <Zap className="w-5 h-5 mr-2 animate-spin" />
                  Locking Baseline...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Execute Phase 6 Baseline Lock
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Results */}
      {lockResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Enterprise Baseline Successfully Locked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Certification Overview */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-green-800">Enterprise Certification</h4>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  {lockResult.certification.overallScore.toFixed(1)}% Overall Score
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">Certification Type:</span>
                  <p className="text-green-600">{lockResult.certification.type}</p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Valid Until:</span>
                  <p className="text-green-600">
                    {new Date(lockResult.certification.validUntil).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Certified At:</span>
                  <p className="text-green-600">
                    {new Date(lockResult.certification.certifiedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-green-700">Components Locked:</span>
                  <p className="text-green-600">{lockResult.componentLockIds.length} Components</p>
                </div>
              </div>
            </div>

            {/* Component Scores */}
            <div className="space-y-3">
              <h4 className="font-semibold">Component Validation Scores</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(lockResult.certification.componentScores).map(([component, score]: [string, any]) => (
                  <div key={component} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium capitalize">
                        {component.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge 
                      variant={score >= 90 ? "default" : "secondary"}
                      className={score >= 90 ? "bg-green-100 text-green-800" : ""}
                    >
                      {score.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* System Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <Archive className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium">Baseline Snapshot</h5>
                <p className="text-sm text-muted-foreground">
                  ID: {lockResult.baselineSnapshotId.substring(0, 8)}...
                </p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium">Component Locks</h5>
                <p className="text-sm text-muted-foreground">
                  {lockResult.componentLockIds.length} Secured
                </p>
              </div>
              <div className="text-center">
                <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h5 className="font-medium">Certification</h5>
                <p className="text-sm text-muted-foreground">
                  ID: {lockResult.certificationId.substring(0, 8)}...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Notice */}
      {!lockResult && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Important Notice</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Locking the baseline will create an immutable snapshot of the current Phase 6 state. 
                  This action cannot be undone and will serve as the enterprise production baseline. 
                  Ensure all systems are in their desired state before proceeding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}