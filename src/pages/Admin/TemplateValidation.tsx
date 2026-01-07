/**
 * Admin Template Validation Page
 * 
 * Shows validation status for all marketplace templates
 * with pass/fail indicators and detailed metrics.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  RefreshCw,
  Download,
  GraduationCap,
  Building2,
  Layers,
  Zap
} from 'lucide-react';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';
import { auditAllTemplates, generateAuditReport, getFixSuggestions, TemplateAuditResult, AuditSummary } from '@/pages/EduTree/v5/utils/templateAudit';

const TemplateValidation: React.FC = () => {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  const { results, summary } = useMemo(() => {
    return auditAllTemplates(marketplaceTemplates as any[]);
  }, []);
  
  const toggleExpanded = (id: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const downloadReport = () => {
    const report = generateAuditReport(marketplaceTemplates as any[]);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-audit-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const passRate = summary.totalTemplates > 0 
    ? Math.round((summary.passingTemplates / summary.totalTemplates) * 100) 
    : 0;
  
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Template Validation
          </h1>
          <p className="text-muted-foreground">
            Ensure all marketplace templates lead to graduation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{summary.totalTemplates}</div>
                <div className="text-sm text-muted-foreground">Total Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.passingTemplates}</div>
                <div className="text-sm text-muted-foreground">Passing</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <div className="text-2xl font-bold text-destructive">{summary.failingTemplates}</div>
                <div className="text-sm text-muted-foreground">Failing</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{summary.warningsOnly}</div>
                <div className="text-sm text-muted-foreground">Warnings Only</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Pass Rate Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Overall Pass Rate</span>
            <span className="text-lg font-bold">{passRate}%</span>
          </div>
          <Progress value={passRate} className="h-3" />
        </CardContent>
      </Card>
      
      {/* By School */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            By School
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.bySchool).map(([school, stats]) => (
              <div key={school} className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="font-bold">{school}</div>
                <div className="text-sm text-muted-foreground">
                  {stats.passing}/{stats.total} passing
                </div>
                <Progress 
                  value={(stats.passing / stats.total) * 100} 
                  className="h-2 mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Common Issues */}
      {summary.commonIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.commonIssues.slice(0, 8).map(issue => (
                <Badge 
                  key={issue.code} 
                  variant={issue.code.includes('SHORTFALL') ? 'destructive' : 'secondary'}
                >
                  {issue.code}: {issue.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Template List */}
      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {results.map(result => (
            <TemplateRow 
              key={result.templateId}
              result={result}
              isExpanded={expandedTemplates.has(result.templateId)}
              onToggle={() => toggleExpanded(result.templateId)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

interface TemplateRowProps {
  result: TemplateAuditResult;
  isExpanded: boolean;
  onToggle: () => void;
}

const TemplateRow: React.FC<TemplateRowProps> = ({ result, isExpanded, onToggle }) => {
  const suggestions = getFixSuggestions(result);
  const m = result.validation.metrics;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer">
          <div className="flex items-center gap-3">
            {result.passesAll ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <div className="font-medium">{result.label}</div>
              <div className="text-sm text-muted-foreground">
                {result.anchorSchool} • {result.optimization}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{m.totalCredits}/120 cr</div>
              <div className="text-xs text-muted-foreground">
                {result.errorCount} errors, {result.warningCount} warnings
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-8 mt-2 p-4 bg-background border rounded-lg space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">University Credits</div>
              <div className="font-medium">{m.universityCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Upper-Division</div>
              <div className="font-medium">{m.upperDivCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">MOOC Credits</div>
              <div className="font-medium">{m.moocCredits}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Modules Filled</div>
              <div className="font-medium">{m.filledModules}/{m.moduleCount}</div>
            </div>
          </div>
          
          {/* Provider Breakdown */}
          {Object.keys(m.creditsByProvider).length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Credits by Provider</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(m.creditsByProvider).map(([provider, credits]) => (
                  <Badge key={provider} variant="outline">
                    {provider}: {credits}cr
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Gen-Ed Breakdown */}
          {Object.keys(m.genedCreditsByCategory).length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Gen-Ed by Category</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(m.genedCreditsByCategory).map(([cat, credits]) => (
                  <Badge key={cat} variant="outline">
                    {cat}: {credits}cr
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Issues */}
          {result.validation.issues.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Issues</div>
              <div className="space-y-1">
                {result.validation.issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className={`text-sm p-2 rounded ${
                      issue.type === 'error' 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-amber-500/10 text-amber-700'
                    }`}
                  >
                    <span className="font-medium">[{issue.code}]</span> {issue.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Fix Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Suggested Fixes</div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default TemplateValidation;
