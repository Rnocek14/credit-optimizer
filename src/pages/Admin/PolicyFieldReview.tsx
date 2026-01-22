import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronUp,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Quote,
  Shield,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
interface FieldExtraction {
  id: string;
  job_id: string;
  field_path: string;
  extracted_value: unknown;
  confidence: number;
  source_quote: string | null;
  source_url: string | null;
  review_status: string;
  reviewer_notes: string | null;
  final_value: unknown | null;
  created_at: string | null;
}

interface ScrapeJob {
  id: string;
  institution: string;
  url: string;
  job_type: string;
  status: string;
}

interface PromotionCandidate {
  pack_id: string;
  institution: string;
  status: string;
  confidence_score: number;
  has_ground_truth: boolean;
  gate_status: 'green' | 'yellow' | 'red';
  is_promotable: boolean;
}

// Confidence badge component
function ConfidenceBadge({ score }: { score: number }) {
  let color = 'bg-red-100 text-red-800 border-red-200';
  if (score >= 85) {
    color = 'bg-green-100 text-green-800 border-green-200';
  } else if (score >= 60) {
    color = 'bg-amber-100 text-amber-800 border-amber-200';
  }
  
  return (
    <Badge variant="outline" className={color}>
      {score}%
    </Badge>
  );
}

// Review status badge
function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; label: string; className: string }> = {
    pending: { icon: AlertTriangle, label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    approved: { icon: CheckCircle, label: 'Approved', className: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { icon: XCircle, label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
    modified: { icon: Edit2, label: 'Modified', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  };
  
  const { icon: Icon, label, className } = config[status] || config.pending;
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function PolicyFieldReview() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialInstitution = searchParams.get('institution') || '';
  
  const [selectedInstitution, setSelectedInstitution] = useState<string>(initialInstitution);
  const [editingField, setEditingField] = useState<FieldExtraction | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('admin_policy_review_pending_only');
    return stored !== null ? stored === 'true' : true; // Default true if not set
  });

  // Fetch institutions from both policy packs AND scrape jobs (union for new schools)
  const { data: institutions = [] } = useQuery({
    queryKey: ['extraction-institutions'],
    queryFn: async () => {
      const [packsResult, jobsResult] = await Promise.all([
        supabase.from('institution_policy_packs').select('institution'),
        supabase.from('school_scrape_jobs').select('institution_code'),
      ]);
      
      const packInstitutions = (packsResult.data || []).map(p => p.institution);
      const jobInstitutions = (jobsResult.data || []).map(j => j.institution_code);
      
      return Array.from(new Set([...packInstitutions, ...jobInstitutions])).filter(Boolean).sort();
    },
  });

  // Fetch field extractions - filter by institution via job_id join
  const { data: extractions = [], isLoading: loadingExtractions, refetch: refetchExtractions } = useQuery({
    queryKey: ['field-extractions', selectedInstitution],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      
      // Get recent job IDs for this institution (limit to prevent huge IN lists)
      const { data: jobs, error: jobsError } = await supabase
        .from('school_scrape_jobs')
        .select('id')
        .eq('institution_code', selectedInstitution)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) return [];
      
      const jobIds = jobs.map(j => j.id);
      
      // Fetch extractions with deterministic ordering: field_path, then confidence desc, then newest
      const { data, error } = await supabase
        .from('policy_field_extractions')
        .select('*')
        .in('job_id', jobIds)
        .order('field_path', { ascending: true })
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return (data ?? []) as FieldExtraction[];
    },
    enabled: !!selectedInstitution,
  });

  // Fetch promotion candidate for institution
  const { data: promotionCandidate } = useQuery({
    queryKey: ['promotion-candidate', selectedInstitution],
    queryFn: async () => {
      if (!selectedInstitution) return null;
      const { data, error } = await supabase
        .from('v_policy_pack_promotion_candidates')
        .select('*')
        .eq('institution', selectedInstitution)
        .maybeSingle();
      
      if (error) throw error;
      return data as PromotionCandidate | null;
    },
    enabled: !!selectedInstitution,
  });

  // Update extraction status mutation
  const updateExtractionMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      finalValue, 
      notes 
    }: { 
      id: string; 
      status: 'approved' | 'rejected' | 'modified'; 
      finalValue?: unknown;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        review_status: status,
        reviewer_notes: notes || null,
      };
      
      if (status === 'modified' && finalValue !== undefined) {
        updateData.final_value = finalValue;
      }
      
      const { error } = await supabase
        .from('policy_field_extractions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Field review updated');
      setEditingField(null);
      setOverrideValue('');
      setReviewerNotes('');
      // Invalidate caches so UI stays fresh
      queryClient.invalidateQueries({ queryKey: ['field-extractions', selectedInstitution] });
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Write to ground truth mutation
  const writeGroundTruthMutation = useMutation({
    mutationFn: async ({ 
      fieldName, 
      value, 
      sourceUrl 
    }: { 
      fieldName: string; 
      value: unknown;
      sourceUrl?: string;
    }) => {
      if (!selectedInstitution) throw new Error('No institution selected');
      
      // Map field_path to ground truth column names
      // Normalize field_path by extracting the last segment (handles nested paths like policy.max_alt_credit)
      const fieldMapping: Record<string, string> = {
        'residency_credits': 'residency_credits',
        'min_institutional_credits': 'residency_credits',
        'max_transfer_credits': 'max_transfer_credits',
        'max_alt_credit': 'max_ace_nccrs_credits',
        'max_ace_nccrs_credits': 'max_ace_nccrs_credits',
        'total_credits': 'total_credits_required_bachelors',
        'total_credits_required': 'total_credits_required_bachelors',
        'degree_credit_total': 'total_credits_required_bachelors',
        'accepts_ap': 'accepts_ap',
        'accepts_clep': 'accepts_clep',
        'accepts_dsst': 'accepts_dsst',
        'capstone_required': 'capstone_required',
        'cornerstone_required': 'cornerstone_required',
        'min_upper_level_credits': 'min_upper_level_credits',
        'upper_division_min': 'min_upper_level_credits',
      };
      
      // Extract last segment of field path for matching
      const normalizedKey = fieldName.split('.').slice(-1)[0];
      const columnName = fieldMapping[normalizedKey] || fieldMapping[fieldName];
      if (!columnName) {
        throw new Error(`Unknown field: ${fieldName} (normalized: ${normalizedKey})`);
      }
      
      // Upsert to ground truth table
      const { error } = await supabase
        .from('institution_policy_ground_truth')
        .upsert({
          institution: selectedInstitution,
          [columnName]: value,
          source_url: sourceUrl || null,
          last_verified_at: new Date().toISOString(),
        }, {
          onConflict: 'institution',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ground truth updated');
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
    },
    onError: (error: Error) => {
      toast.error(`Ground truth update failed: ${error.message}`);
    },
  });

  // Promote pack mutation
  const promoteMutation = useMutation({
    mutationFn: async ({ packId, force }: { packId: string; force: boolean }) => {
      const { data, error } = await supabase.functions.invoke('promote-policy-pack', {
        body: { packId, forcePromotion: force },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Promotion failed');
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pack promoted successfully');
      setShowPromoteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
      queryClient.invalidateQueries({ queryKey: ['policy-packs-pipeline'] });
    },
    onError: (error: Error) => {
      toast.error(`Promotion failed: ${error.message}`);
    },
  });

  // Build pack mutation - trigger policy refresh for selected institution
  const buildPackMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInstitution) throw new Error('No institution selected');
      
      const { data, error } = await supabase.functions.invoke('policy-refresh-start', {
        body: { 
          institutions: [selectedInstitution],
          run_type: 'manual',
        },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Build failed');
      return data;
    },
    onSuccess: () => {
      toast.success('Build started — policy refresh queued');
      queryClient.invalidateQueries({ queryKey: ['field-extractions', selectedInstitution] });
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
      queryClient.invalidateQueries({ queryKey: ['policy-packs-pipeline'] });
    },
    onError: (error: Error) => {
      toast.error(`Build failed: ${error.message}`);
    },
  });

  // Filter and group extractions by field path
  const filteredExtractions = useMemo(() => {
    if (!showPendingOnly) return extractions;
    return extractions.filter(e => e.review_status === 'pending');
  }, [extractions, showPendingOnly]);

  const groupedExtractions = useMemo(() => {
    const groups: Record<string, FieldExtraction[]> = {};
    filteredExtractions.forEach(ext => {
      if (!groups[ext.field_path]) {
        groups[ext.field_path] = [];
      }
      groups[ext.field_path].push(ext);
    });
    return groups;
  }, [filteredExtractions]);

  // Stats - show both total and filtered counts
  const statsAll = {
    total: extractions.length,
    pending: extractions.filter(e => e.review_status === 'pending').length,
    approved: extractions.filter(e => e.review_status === 'approved').length,
    rejected: extractions.filter(e => e.review_status === 'rejected').length,
    modified: extractions.filter(e => e.review_status === 'modified').length,
  };
  const statsShown = filteredExtractions.length;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policy Field Review</h1>
          <p className="text-muted-foreground">
            Review and approve AI-extracted policy fields with source evidence
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => buildPackMutation.mutate()}
            disabled={!selectedInstitution || buildPackMutation.isPending}
          >
            {buildPackMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Build Pack
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['field-extractions', selectedInstitution] });
              queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
            }} 
            disabled={!selectedInstitution || loadingExtractions}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingExtractions ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/admin/policy-pipeline">
            <Button variant="outline">
              ← Back to Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Institution Selector + Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map(inst => (
                <SelectItem key={inst} value={inst}>{inst}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedInstitution && promotionCandidate && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={
                  promotionCandidate.gate_status === 'green' 
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : promotionCandidate.gate_status === 'yellow'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }
              >
                Gate: {promotionCandidate.gate_status.toUpperCase()}
              </Badge>
              {promotionCandidate.is_promotable && promotionCandidate.status !== 'active' && (
                <Button 
                  size="sm"
                  onClick={() => setShowPromoteDialog(true)}
                  disabled={promoteMutation.isPending}
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Promote Pack
                </Button>
              )}
            </div>
          )}
        </div>

        {selectedInstitution && (
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={(e) => {
                  setShowPendingOnly(e.target.checked);
                  window.localStorage.setItem('admin_policy_review_pending_only', String(e.target.checked));
                }}
                className="rounded border-input"
              />
              <span className="text-muted-foreground">Pending only</span>
            </label>
            <span className="text-muted-foreground">
              Showing {statsShown} {showPendingOnly ? 'pending' : ''} ({statsAll.total} total)
            </span>
            <span className="text-yellow-600 dark:text-yellow-400">Pending: {statsAll.pending}</span>
            <span className="text-green-600 dark:text-green-400">Approved: {statsAll.approved}</span>
            <span className="text-destructive">Rejected: {statsAll.rejected}</span>
            <span className="text-primary">Modified: {statsAll.modified}</span>
          </div>
        )}
      </div>

      {/* Extractions Table */}
      {!selectedInstitution ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an institution to review extracted fields
          </CardContent>
        </Card>
      ) : loadingExtractions ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedExtractions).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No field extractions found for {selectedInstitution}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExtractions).map(([fieldPath, fieldExtractions]) => (
            <Card key={fieldPath}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{fieldPath}</CardTitle>
                  <div className="flex gap-2">
                    {fieldExtractions.map(ext => (
                      <ReviewStatusBadge key={ext.id} status={ext.review_status} />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Value</TableHead>
                      <TableHead className="w-[80px]">Confidence</TableHead>
                      <TableHead>Source Quote</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldExtractions.map(ext => (
                      <TableRow key={ext.id}>
                        <TableCell className="font-mono text-sm">
                          {ext.final_value !== null 
                            ? <span className="text-blue-600">{formatValue(ext.final_value)}</span>
                            : formatValue(ext.extracted_value)
                          }
                        </TableCell>
                        <TableCell>
                          <ConfidenceBadge score={ext.confidence} />
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {ext.source_quote ? (
                            <div className="flex items-start gap-2">
                              <Quote className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm italic text-muted-foreground line-clamp-2">
                                "{ext.source_quote}"
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No quote</span>
                          )}
                          {ext.source_url && (
                            <a 
                              href={ext.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                              Source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <ReviewStatusBadge status={ext.review_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => updateExtractionMutation.mutate({ 
                                id: ext.id, 
                                status: 'approved' 
                              })}
                              disabled={updateExtractionMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => updateExtractionMutation.mutate({ 
                                id: ext.id, 
                                status: 'rejected' 
                              })}
                              disabled={updateExtractionMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setEditingField(ext);
                                setOverrideValue(formatValue(ext.extracted_value));
                              }}
                              disabled={updateExtractionMutation.isPending}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => writeGroundTruthMutation.mutate({
                                fieldName: ext.field_path,
                                value: ext.final_value ?? ext.extracted_value,
                                sourceUrl: ext.source_url || undefined,
                              })}
                              disabled={writeGroundTruthMutation.isPending}
                              title="Write to Ground Truth"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Override Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Field Value</DialogTitle>
            <DialogDescription>
              Modify the extracted value for <code>{editingField?.field_path}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Original Value</Label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                {formatValue(editingField?.extracted_value)}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="override">New Value</Label>
              <Input
                id="override"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                placeholder="Enter corrected value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Reviewer Notes</Label>
              <Textarea
                id="notes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Why is this being modified?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingField(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!editingField) return;
                
                // Parse value appropriately - try JSON first for arrays/objects
                let parsedValue: unknown = overrideValue;
                try {
                  // Try JSON parsing first (handles arrays, objects, numbers, booleans, null)
                  parsedValue = JSON.parse(overrideValue);
                } catch {
                  // Fallback: keep as string if not valid JSON
                  parsedValue = overrideValue;
                }
                
                updateExtractionMutation.mutate({
                  id: editingField.id,
                  status: 'modified',
                  finalValue: parsedValue,
                  notes: reviewerNotes,
                });
              }}
              disabled={updateExtractionMutation.isPending}
            >
              {updateExtractionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Confirmation Dialog */}
      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {promotionCandidate?.gate_status === 'yellow' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Confirm Yellow Gate Promotion
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Confirm Pack Promotion
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are promoting the policy pack for <strong>{selectedInstitution}</strong>.
              </p>
              {promotionCandidate?.gate_status === 'yellow' && (
                <p className="text-amber-600">
                  This pack has a yellow gate. Templates will be set to pending_review.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promotionCandidate) {
                  promoteMutation.mutate({ 
                    packId: promotionCandidate.pack_id, 
                    force: promotionCandidate.gate_status === 'yellow' 
                  });
                }
              }}
              className={promotionCandidate?.gate_status === 'yellow' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Promote Pack
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
