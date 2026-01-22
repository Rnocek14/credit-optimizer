import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Loader2,
  Plus,
  Play,
  ExternalLink,
  ChevronRight,
  Database,
  FileText,
  Clock,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types for pipeline data
interface InstitutionPack {
  id: string;
  institution: string;
  status: string;
  confidence_score: number | null;
  completeness_score: number | null;
  has_ground_truth: boolean;
  updated_at: string;
  policy_data: Record<string, unknown> | null;
  blocked_reason: string | null;
}

interface UrlTemplate {
  id: string;
  institution_code: string;
  url: string;
  page_type: string;
  priority: number;
  status: string;
  last_scraped_at: string | null;
  created_at: string;
}

interface RefreshTask {
  id: string;
  run_id: string | null;
  institution: string;
  status: string | null;
  reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

// Gate status badge component
function GateStatusBadge({ score, hasGroundTruth }: { score: number | null; hasGroundTruth: boolean }) {
  let status: 'green' | 'yellow' | 'red' = 'red';
  
  if (score === null || score < 50) {
    status = 'red';
  } else if (!hasGroundTruth || score < 80) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  const config = {
    green: { icon: CheckCircle, label: 'Green', className: 'bg-green-100 text-green-800 border-green-200' },
    yellow: { icon: AlertTriangle, label: 'Yellow', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    red: { icon: XCircle, label: 'Red', className: 'bg-red-100 text-red-800 border-red-200' },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-green-500/20 text-green-600', label: 'Active' },
    draft: { color: 'bg-yellow-500/20 text-yellow-600', label: 'Draft' },
    blocked: { color: 'bg-red-500/20 text-red-600', label: 'Blocked' },
    queued: { color: 'bg-blue-500/20 text-blue-600', label: 'Queued' },
    running: { color: 'bg-purple-500/20 text-purple-600', label: 'Running' },
    complete: { color: 'bg-green-500/20 text-green-600', label: 'Complete' },
    failed: { color: 'bg-red-500/20 text-red-600', label: 'Failed' },
  };
  const v = variants[status] || { color: 'bg-muted text-muted-foreground', label: status };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.color}`}>{v.label}</span>;
}

export default function PolicyPackPipeline() {
  const queryClient = useQueryClient();
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [showAddUrlDialog, setShowAddUrlDialog] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newPageType, setNewPageType] = useState('catalog');

  // Fetch all institutions with packs or templates
  const { data: institutions = [], isLoading: loadingInstitutions } = useQuery({
    queryKey: ['pipeline-institutions'],
    queryFn: async () => {
      // Get unique institutions from both packs and templates
      const [packsResult, templatesResult] = await Promise.all([
        supabase.from('institution_policy_packs').select('institution').order('institution'),
        supabase.from('scrape_url_templates').select('institution_code').order('institution_code'),
      ]);
      
      const packInstitutions = new Set((packsResult.data || []).map(p => p.institution));
      const templateInstitutions = new Set((templatesResult.data || []).map(t => t.institution_code));
      
      return Array.from(new Set([...packInstitutions, ...templateInstitutions])).sort();
    },
  });

  // Fetch packs with gate scores
  const { data: packs = [], isLoading: loadingPacks, refetch: refetchPacks } = useQuery({
    queryKey: ['policy-packs-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_policy_packs')
        .select('id, institution, status, confidence_score, completeness_score, has_ground_truth, updated_at, policy_data, blocked_reason')
        .order('institution');
      
      if (error) throw error;
      return (data ?? []) as InstitutionPack[];
    },
  });

  // Fetch URL templates for selected institution
  const { data: urlTemplates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['url-templates', selectedInstitution],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('scrape_url_templates')
        .select('*')
        .eq('institution_code', selectedInstitution)
        .order('priority');
      
      if (error) throw error;
      return (data ?? []) as UrlTemplate[];
    },
    enabled: !!selectedInstitution,
  });

  // Fetch recent refresh tasks for selected institution
  const { data: recentTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['refresh-tasks', selectedInstitution],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('policy_refresh_tasks')
        .select('*')
        .eq('institution', selectedInstitution)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return (data ?? []) as RefreshTask[];
    },
    enabled: !!selectedInstitution,
  });

  // Build pack mutation (triggers policy-refresh-start)
  const buildPackMutation = useMutation({
    mutationFn: async (institution: string) => {
      const { data, error } = await supabase.functions.invoke('policy-refresh-start', {
        body: { 
          institutions: [institution], 
          run_type: 'manual',
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, institution) => {
      toast.success(`Build started: ${data.tasks_created} tasks created`);
      // Use the mutation variable (institution) not selectedInstitution from closure
      queryClient.invalidateQueries({ queryKey: ['refresh-tasks', institution] });
      queryClient.invalidateQueries({ queryKey: ['policy-packs-pipeline'] });
    },
    onError: (error: Error) => {
      toast.error(`Build failed: ${error.message}`);
    },
  });

  // Add URL template mutation
  const addUrlMutation = useMutation({
    mutationFn: async ({ url, pageType }: { url: string; pageType: string }) => {
      if (!selectedInstitution) throw new Error('No institution selected');
      
      const { data, error } = await supabase
        .from('scrape_url_templates')
        .insert({
          institution_code: selectedInstitution,
          url: url.trim(),
          page_type: pageType,
          priority: 5,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('URL template added');
      setShowAddUrlDialog(false);
      setNewUrl('');
      setNewPageType('catalog');
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add URL: ${error.message}`);
    },
  });

  // Delete URL template mutation
  const deleteUrlMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('scrape_url_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('URL template deleted');
      refetchTemplates();
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete URL: ${error.message}`);
    },
  });

  // Get pack for selected institution
  const selectedPack = packs.find(p => p.institution === selectedInstitution);

  // Summary stats
  const stats = {
    total: packs.length,
    active: packs.filter(p => p.status === 'active').length,
    draft: packs.filter(p => p.status === 'draft').length,
    blocked: packs.filter(p => p.status === 'blocked' || p.blocked_reason).length,
  };

  const pageTypes = [
    { value: 'catalog', label: 'Catalog' },
    { value: 'transfer_policy', label: 'Transfer Policy' },
    { value: 'residency_policy', label: 'Residency Policy' },
    { value: 'alt_credit', label: 'Alternative Credit' },
    { value: 'degree_requirements', label: 'Degree Requirements' },
    { value: 'transfer_info', label: 'Transfer Info' },
    { value: 'general_policy', label: 'General Policy' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Pack Pipeline</h1>
          <p className="text-muted-foreground">
            Build and manage institution policy packs with evidence-backed provenance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchPacks()} disabled={loadingPacks}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingPacks ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/admin/policy-promotion">
            <Button variant="outline">
              <ChevronRight className="h-4 w-4 mr-2" />
              Promotion Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Packs</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-700">{stats.active}</div>
            <p className="text-xs text-green-600">Active</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-700">{stats.draft}</div>
            <p className="text-xs text-amber-600">Draft</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-700">{stats.blocked}</div>
            <p className="text-xs text-red-600">Blocked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institution List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Institutions
            </CardTitle>
            <CardDescription>
              Select an institution to view pipeline details
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInstitutions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {institutions.map((inst) => {
                  const pack = packs.find(p => p.institution === inst);
                  return (
                    <button
                      key={inst}
                      onClick={() => setSelectedInstitution(inst)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                        selectedInstitution === inst ? 'bg-muted border-l-2 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{inst}</span>
                        <div className="flex items-center gap-2">
                          {pack ? (
                            <>
                              <GateStatusBadge 
                                score={pack.confidence_score} 
                                hasGroundTruth={pack.has_ground_truth} 
                              />
                              <StatusBadge status={pack.status} />
                            </>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              No Pack
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Institution Detail Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedInstitution ? `${selectedInstitution} Details` : 'Select an Institution'}
                </CardTitle>
                <CardDescription>
                  {selectedInstitution 
                    ? 'Manage URL sources, view tasks, and trigger builds'
                    : 'Click an institution to view details'
                  }
                </CardDescription>
              </div>
              {selectedInstitution && (
                <Button
                  onClick={() => buildPackMutation.mutate(selectedInstitution)}
                  disabled={buildPackMutation.isPending}
                >
                  {buildPackMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Build Pack
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedInstitution ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an institution from the list to view pipeline details</p>
              </div>
            ) : (
              <Tabs defaultValue="sources">
                <TabsList className="mb-4">
                  <TabsTrigger value="sources">URL Sources</TabsTrigger>
                  <TabsTrigger value="tasks">Recent Tasks</TabsTrigger>
                  <TabsTrigger value="pack">Pack Status</TabsTrigger>
                </TabsList>

                {/* URL Sources Tab */}
                <TabsContent value="sources" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {urlTemplates.length} URL templates configured
                    </p>
                    <Dialog open={showAddUrlDialog} onOpenChange={setShowAddUrlDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add URL
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add URL Source</DialogTitle>
                          <DialogDescription>
                            Add a new policy page URL for {selectedInstitution}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                              id="url"
                              placeholder="https://example.edu/policy/transfer-credits"
                              value={newUrl}
                              onChange={(e) => setNewUrl(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pageType">Page Type</Label>
                            <Select value={newPageType} onValueChange={setNewPageType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {pageTypes.map(pt => (
                                  <SelectItem key={pt.value} value={pt.value}>
                                    {pt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddUrlDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => addUrlMutation.mutate({ url: newUrl, pageType: newPageType })}
                            disabled={!newUrl.trim() || addUrlMutation.isPending}
                          >
                            {addUrlMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Add URL
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {loadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : urlTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No URL sources configured</p>
                      <p className="text-xs">Add URLs to start building a policy pack</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {urlTemplates.map((template) => {
                          // Safe URL parsing - avoid crash on malformed URLs
                          let displayPath = template.url;
                          try {
                            const urlObj = new URL(template.url);
                            displayPath = urlObj.pathname.slice(0, 50) + (urlObj.pathname.length > 50 ? '...' : '');
                          } catch {
                            displayPath = template.url.slice(0, 50) + (template.url.length > 50 ? '...' : '');
                          }
                          
                          return (
                          <TableRow key={template.id}>
                            <TableCell className="max-w-[300px]">
                              <a 
                                href={template.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate block"
                                title={template.url}
                              >
                                {displayPath}
                                <ExternalLink className="h-3 w-3 inline ml-1" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{template.page_type}</Badge>
                            </TableCell>
                            <TableCell>{template.priority}</TableCell>
                            <TableCell>
                              <StatusBadge status={template.status || 'active'} />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteUrlMutation.mutate(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Recent Tasks Tab */}
                <TabsContent value="tasks" className="space-y-4">
                  {loadingTasks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent tasks</p>
                      <p className="text-xs">Click "Build Pack" to start a refresh run</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <StatusBadge status={task.status || 'queued'} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.started_at 
                                ? new Date(task.started_at).toLocaleString()
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.completed_at 
                                ? new Date(task.completed_at).toLocaleString()
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {task.reason || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Pack Status Tab */}
                <TabsContent value="pack" className="space-y-4">
                  {selectedPack ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <StatusBadge status={selectedPack.status} />
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Gate</p>
                          <GateStatusBadge 
                            score={selectedPack.confidence_score} 
                            hasGroundTruth={selectedPack.has_ground_truth} 
                          />
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                          <p className="text-lg font-semibold">
                            {selectedPack.confidence_score ?? '-'}%
                          </p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Ground Truth</p>
                          <p className="text-lg font-semibold">
                            {selectedPack.has_ground_truth ? '✓ Verified' : '✗ No'}
                          </p>
                        </div>
                      </div>

                      {selectedPack.blocked_reason && (
                        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                          <p className="text-sm font-medium text-red-800">Blocked Reason:</p>
                          <p className="text-sm text-red-600">{selectedPack.blocked_reason}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link to={`/admin/policy-field-review?institution=${selectedInstitution}`}>
                          <Button variant="outline">
                            Review Extracted Fields
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                        {selectedPack.status !== 'active' && (
                          <Link to="/admin/policy-promotion">
                            <Button variant="default">
                              Go to Promotion Queue
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No policy pack exists for this institution yet.</p>
                      <p className="text-xs">Add URL sources and click "Build Pack" to create one.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
