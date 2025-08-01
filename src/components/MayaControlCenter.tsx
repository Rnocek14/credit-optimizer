import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  Shield, 
  Brain, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Pause,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { VoiceCommandInterface } from './VoiceCommandInterface';

export function MayaControlCenter() {
  const { toast } = useToast();
  const { preferences, updatePreference, loading } = useUserPreferences();

  const [activeWorkflows, setActiveWorkflows] = useState([
    {
      id: '1',
      title: 'Data Scientist Career Path',
      status: 'running',
      progress: 65,
      nextAction: 'Complete Python Course',
      lastUpdate: '2 hours ago'
    },
    {
      id: '2',
      title: 'Market Intelligence Monitoring',
      status: 'paused',
      progress: 100,
      nextAction: 'Review alerts',
      lastUpdate: '1 day ago'
    },
    {
      id: '3',
      title: 'Skill Gap Analysis',
      status: 'running',
      progress: 30,
      nextAction: 'Analyze resume updates',
      lastUpdate: '30 minutes ago'
    }
  ]);

  const updateSetting = (key: string, value: any) => {
    updatePreference(key as any, value);
  };

  const toggleWorkflow = (workflowId: string) => {
    setActiveWorkflows(prev => 
      prev.map(workflow => 
        workflow.id === workflowId 
          ? { 
              ...workflow, 
              status: workflow.status === 'running' ? 'paused' : 'running' 
            }
          : workflow
      )
    );
    
    toast({
      title: "Workflow Updated",
      description: "Workflow status has been changed.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4 text-green-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Maya Personalization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Maya Personalization
          </CardTitle>
          <CardDescription>
            Customize how Maya interacts with you and manages your career development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Communication Style</label>
                <Select 
                  value={preferences.communicationStyle} 
                  onValueChange={(value) => updateSetting('communicationStyle', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Response Frequency</label>
                <Select 
                  value={preferences.responseFrequency} 
                  onValueChange={(value) => updateSetting('responseFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Only critical updates</SelectItem>
                    <SelectItem value="balanced">Balanced - Regular insights</SelectItem>
                    <SelectItem value="frequent">Frequent - All recommendations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Alert Threshold: {preferences.alertThreshold}%
                </label>
                <Slider
                  value={[preferences.alertThreshold]}
                  onValueChange={(value) => updateSetting('alertThreshold', value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only show alerts above this confidence level
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Workflow Approval</label>
                <Select 
                  value={preferences.workflowApproval} 
                  onValueChange={(value) => updateSetting('workflowApproval', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-approve all workflows</SelectItem>
                    <SelectItem value="high_confidence">Auto-approve high confidence only</SelectItem>
                    <SelectItem value="manual">Manual approval required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Privacy Level</label>
                <Select 
                  value={preferences.privacyLevel} 
                  onValueChange={(value) => updateSetting('privacyLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Basic insights only</SelectItem>
                    <SelectItem value="standard">Standard - Balanced learning</SelectItem>
                    <SelectItem value="enhanced">Enhanced - Full personalization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autonomous Actions Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Autonomous Actions
          </CardTitle>
          <CardDescription>
            Control what actions Maya can take automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Autonomous Actions</p>
              <p className="text-sm text-muted-foreground">
                Allow Maya to create workflows and take actions automatically
              </p>
            </div>
            <Switch
              checked={preferences.autonomousActions}
              onCheckedChange={(checked) => updateSetting('autonomousActions', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto Workflow Creation</p>
                <p className="text-sm text-muted-foreground">Create learning paths automatically</p>
              </div>
              <Switch
                checked={preferences.autoWorkflowCreation}
                onCheckedChange={(checked) => updateSetting('autoWorkflowCreation', checked)}
                disabled={!preferences.autonomousActions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Market Alerts</p>
                <p className="text-sm text-muted-foreground">Monitor market trends and opportunities</p>
              </div>
              <Switch
                checked={preferences.marketAlerts}
                onCheckedChange={(checked) => updateSetting('marketAlerts', checked)}
                disabled={!preferences.autonomousActions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Skill Gap Analysis</p>
                <p className="text-sm text-muted-foreground">Automatically analyze skill development needs</p>
              </div>
              <Switch
                checked={preferences.skillGapAnalysis}
                onCheckedChange={(checked) => updateSetting('skillGapAnalysis', checked)}
                disabled={!preferences.autonomousActions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Career Recommendations</p>
                <p className="text-sm text-muted-foreground">Generate personalized career suggestions</p>
              </div>
              <Switch
                checked={preferences.careerRecommendations}
                onCheckedChange={(checked) => updateSetting('careerRecommendations', checked)}
                disabled={!preferences.autonomousActions}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Workflows
          </CardTitle>
          <CardDescription>
            Monitor and control your active Maya workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeWorkflows.map((workflow) => (
              <div key={workflow.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(workflow.status)}
                    <div>
                      <h4 className="font-medium">{workflow.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {workflow.lastUpdate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={workflow.status === 'running' ? 'default' : 'secondary'}>
                      {workflow.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWorkflow(workflow.id)}
                    >
                      {workflow.status === 'running' ? 'Pause' : 'Resume'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{workflow.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${workflow.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Next: {workflow.nextAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data Controls
          </CardTitle>
          <CardDescription>
            Manage how Maya uses your data for learning and improvement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Personalized Learning</p>
              <p className="text-sm text-muted-foreground">
                Use your data to improve recommendations
              </p>
            </div>
            <Switch
              checked={preferences.personalizedLearning}
              onCheckedChange={(checked) => updateSetting('personalizedLearning', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Collection</p>
              <p className="text-sm text-muted-foreground">
                Allow Maya to collect usage analytics
              </p>
            </div>
            <Switch
              checked={preferences.dataCollection}
              onCheckedChange={(checked) => updateSetting('dataCollection', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Data Export & Deletion</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export My Data
              </Button>
              <Button variant="outline" size="sm" className="text-red-600">
                Delete All Data
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Export your data or request complete deletion from Maya's systems
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Command Interface */}
      <VoiceCommandInterface />
    </div>
  );
}