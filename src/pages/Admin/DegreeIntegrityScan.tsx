/**
 * Degree Integrity Scan - Admin verification tool
 * 
 * Runs comprehensive checks on:
 * - Template validity (graduation requirements)
 * - Policy consistency (no drift from institutionPolicies.ts)
 * - Required course presence (SOS-1100 + Capstone)
 * - Policy drift findings across codebase
 * - End-to-end simulations proving system is NOT a random class picker
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, XCircle, AlertTriangle, Download, Shield, Database, FileCheck, AlertOctagon, Play, ChevronDown, Loader2 } from 'lucide-react';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';
import { auditAllTemplates, generateAuditReport } from '@/pages/EduTree/v5/utils/templateAudit';
import { getPolicyOrDefault, getAvailableInstitutions, getNoncollegiateCap, getResidencyCredits } from '@/lib/degree/institutionPolicies';
import { runIntegrityScan, type IntegrityScanResult, type IntegrityScanSummary } from '@/pages/EduTree/v5/engine/integrityScanner';

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
  const [scanResults, setScanResults] = useState<{ summary: IntegrityScanSummary; results: IntegrityScanResult[] } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedSims, setExpandedSims] = useState<Set<string>>(new Set());

  const { results, summary } = useMemo(() => {
    return auditAllTemplates(marketplaceTemplates as any[]);
  }, []);

  const policyCheck = useMemo(() => {
    const institutions = getAvailableInstitutions();
    return institutions.map(code => {
      const policy = getPolicyOrDefault(code);
      // Handle null policy safely
      return {
        code,
        name: policy?.name ?? code,
        noncollegiateCap: getNoncollegiateCap(code, 'bachelor'),
        residency: getResidencyCredits(code, 'standard'),
        upperDiv: policy?.upperDivisionAreaOfStudyMin ?? 18,
        confidence: policy?.overallConfidence ?? 50,
        requiredCourses: policy?.requiredResidenceCourses?.length ?? 0,
      };
    });
  }, []);

  const publishBlockers = results.filter(r => !r.validation.publishable);
  const driftErrors = POLICY_DRIFT_FINDINGS.filter(f => f.severity === 'error');
  const driftWarnings = POLICY_DRIFT_FINDINGS.filter(f => f.severity === 'warning');

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const result = await runIntegrityScan(marketplaceTemplates as any[], { 
        maxSimulations: 1, 
        seed: 1337 
      });
      setScanResults(result);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSimExpanded = (id: string) => {
    setExpandedSims(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      simulations: scanResults,
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
          <TabsTrigger value="simulations" className="gap-2">
            <Play className="h-4 w-4" /> Simulations
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

        <TabsContent value="simulations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>End-to-End Simulations</span>
                <Button onClick={handleRunScan} disabled={isScanning}>
                  {isScanning ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Run Scan</>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!scanResults ? (
                <p className="text-muted-foreground text-center py-8">
                  Click "Run Scan" to execute end-to-end simulations that verify course selection 
                  doesn't create dead-ends and leads to graduation.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Simulation Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{scanResults.summary.totalSimulations}</div>
                      <div className="text-sm text-muted-foreground">Total Runs</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{scanResults.summary.passedSimulations}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">{scanResults.summary.failedSimulations}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">{scanResults.summary.driftFindings.length}</div>
                      <div className="text-sm text-muted-foreground">Drift Found</div>
                    </div>
                  </div>

                  {/* Failure Codes */}
                  {Object.keys(scanResults.summary.failureCodes).length > 0 && (
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      <div className="font-medium mb-2">Failure Codes</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(scanResults.summary.failureCodes).map(([code, count]) => (
                          <Badge key={code} variant="destructive">{code}: {count}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-Template Results */}
                  <div className="space-y-2">
                    {scanResults.results.map(result => (
                      <Collapsible 
                        key={result.templateId}
                        open={expandedSims.has(result.templateId)}
                        onOpenChange={() => toggleSimExpanded(result.templateId)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted">
                            <div className="flex items-center gap-3">
                              {result.passes ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-destructive" />
                              )}
                              <div>
                                <div className="font-medium">{result.templateId}</div>
                                <div className="text-sm text-muted-foreground">{result.anchorSchool}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={result.passes ? 'default' : 'destructive'}>
                                {result.failures.length}F / {result.warnings.length}W
                              </Badge>
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedSims.has(result.templateId) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-8 mt-2 p-4 bg-background border rounded-lg space-y-3">
                            {/* Failures */}
                            {result.failures.length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-destructive mb-1">Failures</div>
                                {result.failures.map((f, idx) => (
                                  <div key={idx} className="text-sm p-2 bg-destructive/10 rounded mb-1">
                                    <span className="font-mono">[{f.code}]</span> {f.message}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Simulation Runs */}
                            {result.simulationRuns.map(run => (
                              <div key={run.runId} className="border-t pt-3">
                                <div className="flex items-center gap-2 mb-2">
                                  {run.success ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  )}
                                  <span className="font-medium">{run.runId}</span>
                                  <Badge variant="outline">
                                    {run.selectionLog.length} selections
                                  </Badge>
                                  {run.blockedSelections.length > 0 && (
                                    <Badge variant="secondary">
                                      {run.blockedSelections.length} blocked
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Graduation Readiness */}
                                {run.finalReadiness && (
                                  <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                    <div>Credits: {run.finalReadiness.totalCredits.earned}/120</div>
                                    <div>Residency: {run.finalReadiness.residency.earned}/{run.finalReadiness.residency.required}</div>
                                    <div>Upper-Div: {run.finalReadiness.upperDivision.earned}/{run.finalReadiness.upperDivision.required}</div>
                                    <div>Transfer: {run.finalReadiness.transferCap.earned}/{run.finalReadiness.transferCap.required}</div>
                                  </div>
                                )}
                                
                                {/* Blockers */}
                                {run.finalReadiness?.blockers && run.finalReadiness.blockers.length > 0 && (
                                  <div className="text-sm text-destructive">
                                    Blockers: {run.finalReadiness.blockers.join('; ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}
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
