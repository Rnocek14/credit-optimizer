import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building, Shield, BarChart3, Globe, Users, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Phase6EnterpriseFeaturesProps {
  userId: string;
}

export function Phase6EnterpriseFeatures({ userId }: Phase6EnterpriseFeaturesProps) {
  const { toast } = useToast();
  const [enterpriseMetrics] = useState({
    scalability: 98.5,
    security: 99.2,
    compliance: 97.8,
    integration: 94.6,
    performance: 96.3
  });

  const [enterpriseFeatures] = useState([
    { name: 'Multi-Tenant Architecture', status: 'active', usage: 89 },
    { name: 'Enterprise SSO Integration', status: 'active', usage: 94 },
    { name: 'Advanced Analytics Dashboard', status: 'active', usage: 87 },
    { name: 'Compliance Monitoring', status: 'active', usage: 92 },
    { name: 'API Management Suite', status: 'active', usage: 85 },
    { name: 'White-label Solutions', status: 'beta', usage: 73 },
  ]);

  const deployEnterpriseUpdate = () => {
    toast({
      title: "Enterprise Update Deployed",
      description: "Rolling out new features to enterprise customers...",
    });
  };

  return (
    <div className="space-y-6">
      {/* Enterprise Metrics */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(enterpriseMetrics).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{value}%</div>
              <div className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <Progress value={value} className="mt-2 h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise Architecture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Enterprise Architecture Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-sm text-muted-foreground">Concurrent Users</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">Zero</div>
              <div className="text-sm text-muted-foreground">Security Incidents</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Enterprise Feature Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {enterpriseFeatures.map((feature) => (
              <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{feature.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={feature.usage} className="w-32 h-2" />
                    <span className="text-sm text-muted-foreground">{feature.usage}% adoption</span>
                  </div>
                </div>
                <Badge variant={feature.status === 'active' ? 'default' : 'secondary'}>
                  {feature.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Security Certifications</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">SOC 2 Type II</span>
                  <Badge variant="default">Certified</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ISO 27001</span>
                  <Badge variant="default">Certified</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">GDPR Compliance</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">HIPAA Ready</span>
                  <Badge variant="default">Ready</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Advanced Security</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Zero Trust Architecture</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">End-to-End Encryption</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Advanced Threat Detection</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Incident Response</span>
                  <Badge variant="default">24/7</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Enterprise Analytics & Reporting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-xl font-bold">24.7M</div>
              <div className="text-sm text-muted-foreground">Data Points/Day</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-xl font-bold">847</div>
              <div className="text-sm text-muted-foreground">Custom Reports</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-xl font-bold">156</div>
              <div className="text-sm text-muted-foreground">Integrations</div>
            </div>
            <div className="text-center p-3 bg-primary/5 rounded-lg">
              <div className="text-xl font-bold">99.2%</div>
              <div className="text-sm text-muted-foreground">Data Accuracy</div>
            </div>
          </div>

          <Button onClick={deployEnterpriseUpdate} className="w-full">
            <Building className="w-4 h-4 mr-2" />
            Deploy Enterprise Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}