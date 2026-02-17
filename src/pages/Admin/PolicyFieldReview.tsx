import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  fetchExtractionInstitutions,
  fetchFieldExtractions,
  fetchPromotionCandidate,
  fetchBuildStatus,
  updateFieldExtraction,
  upsertGroundTruth,
  type FieldExtraction,
  type PromotionCandidate,
} from '@/shared/lib/api/policyPipeline';
import { supabase } from '@/shared/lib/api/client';

// Build status badge component
function BuildStatusBadge({ status, createdAt }: { status: string | null; createdAt: string | null }) {
  if (!status) return null;
  
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
    pending: { label: 'Queued', variant: 'warning' },
    queued: { label: 'Queued', variant: 'warning' },
    running: { label: 'Running', variant: 'default' },
    completed: { label: 'Complete', variant: 'success' },
    failed: { label: 'Failed', variant: 'destructive' },
    blocked: { label: 'Blocked', variant: 'destructive' },
  };
  
  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };
  const timeAgo = createdAt ? formatTimeAgo(new Date(createdAt)) : '';
  
  return (
    <Badge variant={variant} size="sm" title={`Last build: ${timeAgo}`}>
      {label}
    </Badge>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
    return stored !== null ? stored === 'true' : true;
  });

  // Fetch institutions
  const { data: institutions = [] } = useQuery({
    queryKey: ['extraction-institutions'],
    queryFn: fetchExtractionInstitutions,
  });

  // Fetch field extractions
  const { data: extractions = [], isLoading: loadingExtractions } = useQuery({
    queryKey: ['field-extractions', selectedInstitution],
    queryFn: () => fetchFieldExtractions(selectedInstitution),
    enabled: !!selectedInstitution,
  });

  // Fetch promotion candidate
  const { data: promotionCandidate } = useQuery({
    queryKey: ['promotion-candidate', selectedInstitution],
    queryFn: () => fetchPromotionCandidate(selectedInstitution),
    enabled: !!selectedInstitution,
  });

  // Fetch build status
  const { data: buildStatus } = useQuery({
    queryKey: ['build-status', selectedInstitution],
    queryFn: () => fetchBuildStatus(selectedInstitution),
    enabled: !!selectedInstitution,
  });

  // Update extraction status mutation
  const updateExtractionMutation = useMutation({
    mutationFn: async ({ id, status, finalValue, notes }: { 
      id: string; 
      status: 'approved' | 'rejected' | 'modified'; 
      finalValue?: unknown;
      notes?: string;
    }) => {
      await updateFieldExtraction(id, status, finalValue, notes);
    },
    onSuccess: () => {
      toast.success('Field review updated');
      setEditingField(null);
      setOverrideValue('');
      setReviewerNotes('');
      queryClient.invalidateQueries({ queryKey: ['field-extractions', selectedInstitution] });
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Write to ground truth mutation
  const writeGroundTruthMutation = useMutation({
    mutationFn: async ({ fieldName, value, sourceUrl }: { 
      fieldName: string; 
      value: unknown;
      sourceUrl?: string;
    }) => {
      if (!selectedInstitution) throw new Error('No institution selected');
      await upsertGroundTruth(selectedInstitution, fieldName, value, sourceUrl);
    },
    onSuccess: () => {
      toast.success('Ground truth updated');
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', selectedInstitution] });
    },
    onError: (error: Error) => {
      toast.error(`Ground truth update failed: ${error.message}`);
    },
  });

  // Promote pack mutation (edge function — kept inline since it's a one-off invoke)
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

  // Build pack mutation (edge function — kept inline)
  const buildPackMutation = useMutation({
    mutationFn: async (institution: string) => {
      const { data, error } = await supabase.functions.invoke('policy-refresh-start', {
        body: { institutions: [institution], run_type: 'manual' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, institution) => {
      toast.success(`Build started — ${data?.tasks_created ?? 'refresh'} queued`);
      queryClient.invalidateQueries({ queryKey: ['field-extractions', institution] });
      queryClient.invalidateQueries({ queryKey: ['promotion-candidate', institution] });
      queryClient.invalidateQueries({ queryKey: ['build-status', institution] });
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

  // Stats
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Policy Field Review</h1>
            <p className="text-muted-foreground">
              Review and approve AI-extracted policy fields with source evidence
            </p>
          </div>
          {selectedInstitution && buildStatus && (
            <BuildStatusBadge status={buildStatus.status} createdAt={buildStatus.created_at} />
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default"
            onClick={() => selectedInstitution && buildPackMutation.mutate(selectedInstitution)}
            disabled={!selectedInstitution || buildPackMutation.isPending || loadingExtractions}
            title="Triggers policy refresh pipeline for this institution"
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
              <div className="py-3 px-6">
                <div className="flex items-center justify-between">
                  <span className="text-base font-mono font-semibold">{fieldPath}</span>
                  <div className="flex gap-2">
                    {fieldExtractions.map(ext => (
                      <ReviewStatusBadge key={ext.id} status={ext.review_status} />
                    ))}
                  </div>
                </div>
              </div>
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
                
                let parsedValue: unknown = overrideValue;
                try {
                  parsedValue = JSON.parse(overrideValue);
                } catch {
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
