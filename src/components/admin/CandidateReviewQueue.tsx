import { useState } from 'react';
import { Check, X, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useTransferCandidates,
  useReviewCandidate,
  type CandidateStatus,
  type TransferCandidate,
} from '@/hooks/useTransferCandidates';
import { Loader2 } from 'lucide-react';

function CombinedScore({ ai, val }: { ai: number; val: number | null }) {
  if (val == null) return <span className="text-muted-foreground text-xs">—</span>;
  const combined = Math.sqrt(ai * val);
  const color = combined >= 0.8 ? 'text-green-600' : combined >= 0.5 ? 'text-yellow-600' : 'text-red-600';
  return (
    <span className={`font-mono text-sm font-semibold ${color}`}>
      {(combined * 100).toFixed(0)}%
    </span>
  );
}

function FlagBadges({ flags }: { flags: string[] | null }) {
  if (!flags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {flags.map(f => (
        <Badge key={f} variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-300">
          <AlertTriangle className="w-3 h-3 mr-1" />{f}
        </Badge>
      ))}
    </div>
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
        <div className="font-medium text-muted-foreground mb-1">Evidence</div>
        <div className="text-xs max-h-24 overflow-auto whitespace-pre-wrap">
          {candidate.evidence_text?.slice(0, 500) ?? 'No evidence text'}
        </div>
      </div>
      {candidate.validation_result && (
        <div className="col-span-2">
          <div className="font-medium text-muted-foreground mb-1">Validation Detail</div>
          <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
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

export function CandidateReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: candidates, isLoading, error } = useTransferCandidates(statusFilter);
  const reviewMutation = useReviewCandidate();

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
        </CardTitle>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CandidateStatus | 'all')}>
          <SelectTrigger className="w-[140px]">
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
      </CardHeader>
      <CardContent>
        {!candidates?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No candidates with status "{statusFilter}"
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Source</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <TableRow key={c.id} className="group">
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
                        <CombinedScore ai={c.confidence_score} val={c.validation_score} />
                        <div className="text-xs text-muted-foreground mt-0.5">
                          AI: {(c.confidence_score * 100).toFixed(0)}%
                          {c.validation_score != null && ` · V: ${(c.validation_score * 100).toFixed(0)}%`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FlagBadges flags={c.validation_flags} />
                        {!c.validation_flags?.length && <span className="text-xs text-green-600">✓ clean</span>}
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
                    </TableRow>
                  );
                })}
                {/* Expanded detail row rendered outside the map iteration doesn't work in tables,
                    so we handle it inline with a second row */}
                {candidates.map((c) =>
                  expandedId === c.id ? (
                    <TableRow key={`${c.id}-detail`}>
                      <TableCell colSpan={7} className="p-0 border-0">
                        <CandidateDetail candidate={c} />
                      </TableCell>
                    </TableRow>
                  ) : null
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
