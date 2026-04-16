import { useState, useMemo } from 'react';
import { Check, X, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Filter, ArrowUpDown, CheckCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useTransferCandidates,
  useReviewCandidate,
  useBatchReviewCandidates,
  type CandidateStatus,
  type TransferCandidate,
} from '@/hooks/useTransferCandidates';
import { Loader2 } from 'lucide-react';

type SortMode = 'newest' | 'risk' | 'confidence_desc' | 'validation_asc';

function combinedScore(ai: number, val: number | null): number | null {
  if (val == null) return null;
  return Math.sqrt(ai * val);
}

function CombinedScoreBadge({ ai, val }: { ai: number; val: number | null }) {
  const score = combinedScore(ai, val);
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = score * 100;
  const bg = pct >= 80 ? 'bg-green-100 text-green-800 border-green-300'
    : pct >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-red-100 text-red-800 border-red-300';
  return (
    <div className="space-y-0.5">
      <Badge variant="outline" className={`font-mono text-xs ${bg}`}>
        {pct.toFixed(0)}%
      </Badge>
      <div className="text-[10px] text-muted-foreground leading-tight">
        AI {(ai * 100).toFixed(0)} · V {val != null ? (val * 100).toFixed(0) : '—'}
      </div>
    </div>
  );
}

function FlagBadges({ flags }: { flags: string[] | null }) {
  if (!flags?.length) return <span className="text-xs text-green-600">✓ clean</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map(f => (
        <Badge key={f} variant="outline" className="text-[10px] bg-yellow-50 text-yellow-800 border-yellow-300">
          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{f}
        </Badge>
      ))}
    </div>
  );
}

/** Highlight mapping-like patterns in evidence text */
function HighlightedEvidence({ text }: { text: string }) {
  // Match patterns like "COURSE123 → COURSE456", "maps to", "equivalent to", course codes
  const patterns = /(\b[A-Z]{2,6}[\s-]?\d{3,4}[A-Z]?\b|→|->|maps?\s+to|equivalent\s+to|transfers?\s+as|articulates?\s+to)/gi;
  const parts = text.split(patterns);
  
  return (
    <span>
      {parts.map((part, i) => {
        if (patterns.test(part)) {
          return <mark key={i} className="bg-primary/20 text-primary font-medium px-0.5 rounded">{part}</mark>;
        }
        // Reset regex lastIndex
        patterns.lastIndex = 0;
        if (/(\b[A-Z]{2,6}[\s-]?\d{3,4}[A-Z]?\b|→|->|maps?\s+to|equivalent\s+to|transfers?\s+as|articulates?\s+to)/i.test(part)) {
          return <mark key={i} className="bg-primary/20 text-primary font-medium px-0.5 rounded">{part}</mark>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function CandidateDetail({ candidate }: { candidate: TransferCandidate }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg text-sm">
      <div>
        <div className="font-medium text-muted-foreground mb-1">AI Model</div>
        <div>{candidate.ai_model ?? '—'}</div>
      </div>
      <div>
        <div className="font-medium text-muted-foreground mb-1">Batch ID</div>
        <div className="font-mono text-xs">{candidate.batch_id?.slice(0, 8) ?? '—'}</div>
      </div>
      <div className="col-span-2">
        <div className="font-medium text-muted-foreground mb-1">Evidence (highlighted)</div>
        <div className="text-xs max-h-32 overflow-auto whitespace-pre-wrap bg-background p-2 rounded border">
          {candidate.evidence_text
            ? <HighlightedEvidence text={candidate.evidence_text.slice(0, 800)} />
            : <span className="text-muted-foreground">No evidence text</span>
          }
        </div>
      </div>
      {candidate.validation_result && (
        <div className="col-span-2">
          <div className="font-medium text-muted-foreground mb-1">Validation Detail</div>
          <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32 border">
            {JSON.stringify(candidate.validation_result, null, 2)}
          </pre>
        </div>
      )}
      {candidate.promotion_error && (
        <div className="col-span-2">
          <div className="font-medium text-destructive mb-1">Promotion Error</div>
          <div className="text-xs text-destructive">{candidate.promotion_error}</div>
        </div>
      )}
    </div>
  );
}

function sortCandidates(candidates: TransferCandidate[], mode: SortMode): TransferCandidate[] {
  return [...candidates].sort((a, b) => {
    switch (mode) {
      case 'risk': {
        // Highest risk first: high AI confidence + low validation = danger zone
        const riskA = a.validation_score != null ? a.confidence_score - a.validation_score : 0;
        const riskB = b.validation_score != null ? b.confidence_score - b.validation_score : 0;
        return riskB - riskA; // biggest gap first
      }
      case 'confidence_desc':
        return b.confidence_score - a.confidence_score;
      case 'validation_asc': {
        const va = a.validation_score ?? 1;
        const vb = b.validation_score ?? 1;
        return va - vb; // lowest validation first
      }
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

export function CandidateReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'all'>('pending');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: candidates, isLoading, error } = useTransferCandidates(statusFilter);
  const reviewMutation = useReviewCandidate();
  const batchReview = useBatchReviewCandidates();

  const sorted = useMemo(
    () => sortCandidates(candidates ?? [], sortMode),
    [candidates, sortMode],
  );

  const pendingSelected = useMemo(
    () => sorted.filter(c => selectedIds.has(c.id) && c.status === 'pending'),
    [sorted, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pending = sorted.filter(c => c.status === 'pending');
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map(c => c.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-destructive text-sm">
          Failed to load candidates: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Transfer Rule Review Queue
          {sorted.length > 0 && (
            <Badge variant="secondary" className="ml-1">{sorted.length}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Batch actions */}
          {pendingSelected.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <Badge variant="outline" className="text-xs">{pendingSelected.length} selected</Badge>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => {
                  batchReview.mutate({ ids: pendingSelected.map(c => c.id), action: 'approve' });
                  setSelectedIds(new Set());
                }}
                disabled={batchReview.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => {
                  batchReview.mutate({ ids: pendingSelected.map(c => c.id), action: 'reject' });
                  setSelectedIds(new Set());
                }}
                disabled={batchReview.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject All
              </Button>
            </div>
          )}
          {/* Sort */}
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[150px]">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="risk">Risk (danger zone)</SelectItem>
              <SelectItem value="confidence_desc">Highest AI</SelectItem>
              <SelectItem value="validation_asc">Lowest Validation</SelectItem>
            </SelectContent>
          </Select>
          {/* Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CandidateStatus | 'all')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="promoted">Promoted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!sorted.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No candidates with status "{statusFilter}"
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    {statusFilter === 'pending' && (
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === sorted.filter(c => c.status === 'pending').length}
                        onCheckedChange={toggleAll}
                      />
                    )}
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Combined</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.flatMap((c) => {
                  const isExpanded = expandedId === c.id;
                  const rows = [
                    <TableRow key={c.id} className={`group ${selectedIds.has(c.id) ? 'bg-primary/5' : ''}`}>
                      <TableCell>
                        {c.status === 'pending' && (
                          <Checkbox
                            checked={selectedIds.has(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.source_institution}</div>
                        <div className="text-xs text-muted-foreground">{c.source_course_code}</div>
                        {c.source_course_title && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.source_course_title}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.target_institution}</div>
                        <div className="text-xs text-muted-foreground">{c.target_course_code ?? 'elective'}</div>
                        {c.target_course_title && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.target_course_title}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          c.status === 'promoted' ? 'default' :
                          c.status === 'approved' ? 'secondary' :
                          c.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CombinedScoreBadge ai={c.confidence_score} val={c.validation_score} />
                      </TableCell>
                      <TableCell>
                        <FlagBadges flags={c.validation_flags} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.evidence_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={c.evidence_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          {c.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => reviewMutation.mutate({ id: c.id, action: 'approve' })}
                                disabled={reviewMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => reviewMutation.mutate({ id: c.id, action: 'reject' })}
                                disabled={reviewMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>,
                  ];
                  if (isExpanded) {
                    rows.push(
                      <TableRow key={`${c.id}-detail`}>
                        <TableCell colSpan={8} className="p-0 border-0">
                          <CandidateDetail candidate={c} />
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return rows;
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
