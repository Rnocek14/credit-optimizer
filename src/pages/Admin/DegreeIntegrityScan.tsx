/**
 * Degree Integrity Scan - Admin verification tool
 * 
 * Runs comprehensive checks on:
 * - Template validity (graduation requirements)
 * - Policy consistency (no drift from institutionPolicies.ts)
 * - Required course presence (SOS-1100 + Capstone)
 * - Policy drift findings across codebase
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle, Download, Shield, Database, FileCheck, AlertOctagon } from 'lucide-react';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';
import { auditAllTemplates, generateAuditReport } from '@/pages/EduTree/v5/utils/templateAudit';
import { getPolicyOrDefault, getAvailableInstitutions, getNoncollegiateCap, getResidencyCredits } from '@/lib/degree/institutionPolicies';

// Static policy drift findings from codebase audit
const POLICY_DRIFT_FINDINGS = [
  {
    file: 'src/pages/EduTree/v5/engine/constraints.ts',
    lines: '253-270',
    issue: 'Hardcoded providerLimits for CLEP/DSST/Sophia/Study.com',
    severity: 'error' as const,
    fix: 'Replace with getNoncollegiateCap() from institutionPolicies.ts',
  },
  {
    file: 'src/lib/creditOptimizer.ts',
    lines: '292-306',
    issue: 'providerLimitMap uses legacy clep_max, dsst_max keys',
    severity: 'error' as const,
    fix: 'Use combined pool validation from validateNoncollegiateCredits()',
  },
  {
    file: 'src/hooks/useInstitutionLimits.ts',
    lines: '5-19',
    issue: 'Interface includes legacy clep_max, dsst_max, sophia_max, study_com_max',
    severity: 'warning' as const,
    fix: 'Update interface to use combined pool model',
  },
  {
    file: 'scripts/optimizer-tables-setup.sql',
    lines: '197-206',
    issue: 'Seeds upper_division_min: 30, alt_credit_max: 80, and per-provider caps',
    severity: 'error' as const,
    fix: 'Update to upper_division_min: 18, alt_credit_max: 90, remove per-provider caps',
  },
  {
    file: 'supabase/migrations/20251022184913_*.sql',
    lines: '72-76',
    issue: 'Seeds TESU with min_residency_credits: 30 (should be 15)',
    severity: 'error' as const,
    fix: 'Update to min_residency_credits: 15 for TESU',
  },
  {
    file: 'supabase/migrations/20250909142159_*.sql',
    lines: '3-7',
    issue: 'Seeds all institutions with residency: 30 or 45',
    severity: 'warning' as const,
    fix: 'Use institution-specific values from institutionPolicies.ts',
  },
  {
    file: 'src/pages/EduTree/v5/EduTreeV5Page.tsx',
    lines: '932-947',
    issue: 'Manual shortfall calculations instead of validateGraduationReadiness()',
    severity: 'warning' as const,
    fix: 'Use validateGraduationReadiness() for consistent validation',
  },
  {
    file: 'src/pages/EduTree/v5/engine/README-TESU-VALIDATOR.md',
    lines: '26-31',
    issue: 'Documents legacy per-provider caps (CLEP: 40, DSST: 30)',
    severity: 'warning' as const,
    fix: 'Update documentation to reflect combined pool model',
  },
];

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
        residency: getResidencyCredits(code, 'standard'),
        upperDiv: policy.upperDivisionAreaOfStudyMin,
        confidence: policy.overallConfidence,
        requiredCourses: policy.requiredResidenceCourses.length,
      };
    });
  }, []);

  const publishBlockers = results.filter(r => !r.validation.publishable);
  const driftErrors = POLICY_DRIFT_FINDINGS.filter(f => f.severity === 'error');
  const driftWarnings = POLICY_DRIFT_FINDINGS.filter(f => f.severity === 'warning');

  const downloadReport = () => {
    const report = generateAuditReport(marketplaceTemplates as any[]);
    const driftReport = POLICY_DRIFT_FINDINGS.map(f => 
      `[${f.severity.toUpperCase()}] ${f.file}:${f.lines}\n  Issue: ${f.issue}\n  Fix: ${f.fix}`
    ).join('\n\n');
    
    const fullReport = `${report}\n\n===== POLICY DRIFT FINDINGS =====\n\n${driftReport}`;
    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-scan-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const data = {
      summary,
      results,
      policyCheck,
      driftFindings: POLICY_DRIFT_FINDINGS,
      scanDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-scan-${new Date().toISOString().split('T')[0]}.json`;
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export TXT
          </Button>
          <Button onClick={downloadJSON}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.passingTemplates}</div>
            <div className="text-sm text-muted-foreground">Passing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-destructive">{summary.failingTemplates}</div>
            <div className="text-sm text-muted-foreground">Failing</div>
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
            <div className="text-3xl font-bold text-destructive">{driftErrors.length}</div>
            <div className="text-sm text-muted-foreground">Drift Errors</div>
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
          <TabsTrigger value="drift" className="gap-2">
            <AlertOctagon className="h-4 w-4" /> Policy Drift ({POLICY_DRIFT_FINDINGS.length})
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

        <TabsContent value="drift" className="space-y-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertOctagon className="h-5 w-5" />
                Policy Drift Errors ({driftErrors.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {driftErrors.map((f, idx) => (
                <div key={idx} className="p-3 bg-destructive/10 rounded-lg">
                  <div className="font-mono text-sm font-medium">{f.file}:{f.lines}</div>
                  <div className="text-sm mt-1">{f.issue}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <strong>Fix:</strong> {f.fix}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle className="text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Policy Drift Warnings ({driftWarnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {driftWarnings.map((f, idx) => (
                <div key={idx} className="p-3 bg-amber-500/10 rounded-lg">
                  <div className="font-mono text-sm font-medium">{f.file}:{f.lines}</div>
                  <div className="text-sm mt-1">{f.issue}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <strong>Fix:</strong> {f.fix}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DegreeIntegrityScan;
