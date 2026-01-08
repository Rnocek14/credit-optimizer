/**
 * Degree Integrity Scan - Admin verification tool
 * 
 * Runs comprehensive checks on:
 * - Template validity (graduation requirements)
 * - Policy consistency (no drift from institutionPolicies.ts)
 * - Required course presence (SOS-1100 + Capstone)
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Download, Shield, Database, FileCheck } from 'lucide-react';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';
import { auditAllTemplates, generateAuditReport } from '@/pages/EduTree/v5/utils/templateAudit';
import { getPolicyOrDefault, getAvailableInstitutions, getNoncollegiateCap } from '@/lib/degree/institutionPolicies';

const DegreeIntegrityScan: React.FC = () => {
  const { results, summary } = useMemo(() => {
    return auditAllTemplates(marketplaceTemplates as any[]);
  }, []);

  const policyCheck = useMemo(() => {
    const institutions = getAvailableInstitutions();
    return institutions.map(code => {
      const policy = getPolicyOrDefault(code);
      return {
        code,
        name: policy.name,
        noncollegiateCap: getNoncollegiateCap(code, 'bachelor'),
        residency: policy.residencyOptions[0]?.credits ?? 0,
        upperDiv: policy.upperDivisionAreaOfStudyMin,
        confidence: policy.overallConfidence,
        requiredCourses: policy.requiredResidenceCourses.length,
      };
    });
  }, []);

  const publishBlockers = results.filter(r => !r.validation.publishable);

  const downloadReport = () => {
    const report = generateAuditReport(marketplaceTemplates as any[]);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-scan-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Degree Integrity Scan
          </h1>
          <p className="text-muted-foreground">Compliance verification for degree templates</p>
        </div>
        <Button onClick={downloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.passingTemplates}</div>
            <div className="text-sm text-muted-foreground">Passing Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-destructive">{summary.failingTemplates}</div>
            <div className="text-sm text-muted-foreground">Failing Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-amber-600">{publishBlockers.length}</div>
            <div className="text-sm text-muted-foreground">Publish Blocked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{policyCheck.length}</div>
            <div className="text-sm text-muted-foreground">Institutions</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileCheck className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Database className="h-4 w-4" /> Policy Values
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {publishBlockers.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Publish Blocked ({publishBlockers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {publishBlockers.map(r => (
                  <div key={r.templateId} className="p-3 bg-destructive/10 rounded-lg">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.validation.issues.filter(i => i.blocksPublish).map(i => i.message).join('; ')}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {results.map(r => (
                <div key={r.templateId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {r.passesAll ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-sm text-muted-foreground">{r.anchorSchool}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.validation.metrics.hasRequiredResidenceCourses ? (
                      <Badge variant="outline" className="text-green-600">Required ✓</Badge>
                    ) : (
                      <Badge variant="destructive">Missing Required</Badge>
                    )}
                    <Badge variant={r.passesAll ? 'default' : 'destructive'}>
                      {r.errorCount}E / {r.warningCount}W
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Central Policy Values (institutionPolicies.ts)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Institution</th>
                      <th className="text-right py-2">Alt Credit Cap</th>
                      <th className="text-right py-2">Residency</th>
                      <th className="text-right py-2">Upper Div</th>
                      <th className="text-right py-2">Req. Courses</th>
                      <th className="text-right py-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyCheck.map(p => (
                      <tr key={p.code} className="border-b">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="text-right">{p.noncollegiateCap}</td>
                        <td className="text-right">{p.residency}</td>
                        <td className="text-right">{p.upperDiv}</td>
                        <td className="text-right">{p.requiredCourses}</td>
                        <td className="text-right">
                          <Badge variant={p.confidence >= 90 ? 'default' : 'secondary'}>
                            {p.confidence}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DegreeIntegrityScan;
