/**
 * Template Refinement Dashboard
 * 
 * Admin tool for refining scraper templates that failed to extract policy values.
 * Shows institutions with missing_numeric_caps findings and their templates.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Shield, AlertTriangle, ExternalLink, ChevronDown, ChevronRight,
  RefreshCw, Check, X, FileText, Wrench, Play 
} from 'lucide-react';
import { toast } from 'sonner';

interface SkipFinding {
  id: string;
  institution: string;
  reason: string;
  details: Record<string, unknown>;
  created_at: string;
}

interface Template {
  id: string;
  institution_code: string;
  page_type: string;
  url: string;
  priority: number;
  last_scraped_at: string | null;
}

interface InstitutionGroup {
  institution: string;
  findings: SkipFinding[];
  templates: Template[];
  lastAttempt: string;
}

export default function TemplateRefinementDashboard() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [expandedInstitution, setExpandedInstitution] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');

  // Fetch skip findings grouped by institution
  const { data: skipFindings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ['template-refinement-findings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_scan_findings')
        .select('*')
        .eq('status', 'skipped')
        .eq('reason', 'missing_numeric_caps')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as SkipFinding[];
    },
  });

  // Fetch all templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['scrape-url-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scrape_url_templates')
        .select('*')
        .order('institution', { ascending: true })
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return (data || []) as Template[];
    },
  });

  // Group findings by institution
  const institutionGroups: InstitutionGroup[] = (() => {
    const grouped = new Map<string, InstitutionGroup>();
    
    skipFindings.forEach(finding => {
      if (!grouped.has(finding.institution)) {
        grouped.set(finding.institution, {
          institution: finding.institution,
          findings: [],
          templates: templates.filter(t => t.institution_code === finding.institution),
          lastAttempt: finding.created_at,
        });
      }
      grouped.get(finding.institution)!.findings.push(finding);
    });
    
    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime()
    );
  })();

  // Update template URL mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, newUrl }: { templateId: string; newUrl: string }) => {
      const { error } = await supabase
        .from('scrape_url_templates')
        .update({ url: newUrl })
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrape-url-templates'] });
      toast.success('Template updated');
      setEditingTemplate(null);
      setNewUrl('');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Rescan institution mutation
  const rescanMutation = useMutation({
    mutationFn: async (institution: string) => {
      const response = await supabase.functions.invoke('transfer-scraper-batch-scan', {
        body: {
          tier: 'tier_a',
          maxPriority: 1,
          concurrency: 1,
          limit: 1,
          startAfter: String.fromCharCode(institution.charCodeAt(0) - 1), // Start just before this institution
        },
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Rescan triggered: ${data?.summary?.processed || 0} processed`);
      queryClient.invalidateQueries({ queryKey: ['template-refinement-findings'] });
    },
    onError: (error) => {
      toast.error(`Rescan failed: ${error.message}`);
    },
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const isLoading = findingsLoading || templatesLoading;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Wrench className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Template Refinement</h1>
        </div>
        <p className="text-muted-foreground">
          Fix scraper templates for institutions with missing policy values
        </p>
        
        <div className="flex gap-4 mt-6">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Main Admin
            </Button>
          </Link>
          <Link to="/admin/transfer-scraper">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Scraper Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-2xl font-bold mb-1">{institutionGroups.length}</div>
          <div className="text-sm text-muted-foreground">Institutions Needing Fixes</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold mb-1">{skipFindings.length}</div>
          <div className="text-sm text-muted-foreground">Total Skip Findings</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold mb-1">{templates.length}</div>
          <div className="text-sm text-muted-foreground">Total Templates</div>
        </Card>
      </div>

      {/* Institution List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : institutionGroups.length === 0 ? (
        <Card className="p-8 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Templates Need Refinement</h3>
          <p className="text-muted-foreground">
            All scanned institutions have successfully extracted policy values.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {institutionGroups.map((group) => (
            <Card key={group.institution}>
              <Collapsible
                open={expandedInstitution === group.institution}
                onOpenChange={(open) => 
                  setExpandedInstitution(open ? group.institution : null)
                }
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedInstitution === group.institution ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <CardTitle className="text-lg">{group.institution}</CardTitle>
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {group.findings.length} skip(s)
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {group.templates.length} template(s)
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            rescanMutation.mutate(group.institution);
                          }}
                          disabled={rescanMutation.isPending}
                        >
                          {rescanMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Last attempt: {new Date(group.lastAttempt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Templates */}
                    <div>
                      <h4 className="font-medium mb-3">Templates</h4>
                      <div className="space-y-3">
                        {group.templates.map((template) => (
                          <div 
                            key={template.id}
                            className="p-3 border rounded-lg bg-muted/30"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    P{template.priority}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {template.page_type}
                                  </span>
                                </div>
                                
                                {editingTemplate === template.id ? (
                                  <div className="flex gap-2 mt-2">
                                    <Input
                                      value={newUrl}
                                      onChange={(e) => setNewUrl(e.target.value)}
                                      placeholder="New URL..."
                                      className="flex-1 text-xs"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => updateTemplateMutation.mutate({
                                        templateId: template.id,
                                        newUrl,
                                      })}
                                      disabled={updateTemplateMutation.isPending}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingTemplate(null);
                                        setNewUrl('');
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <a
                                    href={template.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline break-all flex items-center gap-1"
                                  >
                                    {template.url}
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                )}
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingTemplate(template.id);
                                  setNewUrl(template.url);
                                }}
                              >
                                Edit
                              </Button>
                            </div>
                            
                            {template.last_scraped_at && (
                              <div className="text-xs text-muted-foreground mt-2">
                                Last scraped: {new Date(template.last_scraped_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {group.templates.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No templates defined for this institution.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Skip Details */}
                    <div>
                      <h4 className="font-medium mb-3">Skip Details</h4>
                      <div className="space-y-2">
                        {group.findings.slice(0, 3).map((finding) => (
                          <div 
                            key={finding.id}
                            className="p-2 border rounded text-xs bg-red-50 dark:bg-red-900/20"
                          >
                            <div className="font-medium text-red-700 dark:text-red-300">
                              {finding.reason}
                            </div>
                            {finding.details && (
                              <pre className="mt-1 text-muted-foreground overflow-x-auto">
                                {JSON.stringify(finding.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
