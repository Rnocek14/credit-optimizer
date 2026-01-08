import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, X, Edit2, ExternalLink, Quote } from 'lucide-react';

interface FieldExtraction {
  id: string;
  job_id: string;
  field_path: string;
  extracted_value: unknown;
  confidence: number;
  source_quote: string | null;
  source_url: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'modified';
  reviewer_notes: string | null;
  final_value: unknown | null;
}

interface PolicyReviewFormProps {
  job: {
    id: string;
    institution_code: string;
    extracted_data: Record<string, unknown> | null;
  };
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'bg-green-500';
  if (confidence >= 70) return 'bg-yellow-500';
  if (confidence >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function PolicyReviewForm({ job }: PolicyReviewFormProps) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Fetch field extractions
  const { data: fields, isLoading } = useQuery({
    queryKey: ['field-extractions', job.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('policy_field_extractions')
        .select('*')
        .eq('job_id', job.id)
        .order('field_path');
      
      if (error) throw error;
      return data as FieldExtraction[];
    },
  });

  // Update field mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ 
      fieldId, 
      status, 
      finalValue, 
      notes 
    }: { 
      fieldId: string; 
      status: 'approved' | 'rejected' | 'modified'; 
      finalValue?: unknown;
      notes?: string;
    }) => {
      const { error } = await (supabase as any)
        .from('policy_field_extractions')
        .update({
          review_status: status,
          final_value: finalValue,
          reviewer_notes: notes,
        })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-extractions', job.id] });
      setEditingField(null);
      setEditValue('');
      setReviewerNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update field', { description: (error as Error).message });
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('school_scrape_jobs')
        .update({ 
          status: 'completed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Review completed');
      queryClient.invalidateQueries({ queryKey: ['scrape-jobs'] });
    },
  });

  const handleApprove = (field: FieldExtraction) => {
    updateFieldMutation.mutate({
      fieldId: field.id,
      status: 'approved',
      finalValue: field.extracted_value,
    });
  };

  const handleReject = (field: FieldExtraction) => {
    updateFieldMutation.mutate({
      fieldId: field.id,
      status: 'rejected',
      notes: reviewerNotes || 'Rejected by reviewer',
    });
  };

  const handleModify = (field: FieldExtraction) => {
    try {
      const parsedValue = JSON.parse(editValue);
      updateFieldMutation.mutate({
        fieldId: field.id,
        status: 'modified',
        finalValue: parsedValue,
        notes: reviewerNotes,
      });
    } catch {
      // If not valid JSON, use as string
      updateFieldMutation.mutate({
        fieldId: field.id,
        status: 'modified',
        finalValue: editValue,
        notes: reviewerNotes,
      });
    }
  };

  const pendingCount = fields?.filter(f => f.review_status === 'pending').length ?? 0;
  const allReviewed = pendingCount === 0 && (fields?.length ?? 0) > 0;

  if (isLoading) {
    return <div className="text-center py-8">Loading extractions...</div>;
  }

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No field extractions found for this job
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pendingCount} of {fields.length} fields pending review
        </div>
        {allReviewed && (
          <Button onClick={() => completeJobMutation.mutate()}>
            Complete Review
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {fields.map(field => (
          <div 
            key={field.id}
            className={`border rounded-lg p-4 space-y-3 ${
              field.review_status === 'approved' ? 'border-green-500/50 bg-green-500/5' :
              field.review_status === 'rejected' ? 'border-red-500/50 bg-red-500/5' :
              field.review_status === 'modified' ? 'border-blue-500/50 bg-blue-500/5' :
              ''
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-sm font-medium">{field.field_path}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${getConfidenceColor(field.confidence)}`} 
                    title={`${field.confidence}% confidence`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {field.confidence}% confidence
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {field.review_status}
                  </Badge>
                </div>
              </div>
              
              {field.review_status === 'pending' && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleApprove(field)}
                    title="Approve"
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingField(field.id);
                      setEditValue(formatValue(field.extracted_value));
                    }}
                    title="Modify"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReject(field)}
                    title="Reject"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>

            {/* Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Extracted Value</div>
                <pre className="text-sm bg-muted p-2 rounded overflow-auto max-h-32">
                  {formatValue(field.extracted_value)}
                </pre>
              </div>
              
              {field.final_value !== null && field.review_status === 'modified' && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Modified Value</div>
                  <pre className="text-sm bg-blue-500/10 p-2 rounded overflow-auto max-h-32">
                    {formatValue(field.final_value)}
                  </pre>
                </div>
              )}
            </div>

            {/* Source Quote */}
            {field.source_quote && (
              <div className="text-sm">
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                  <Quote className="w-3 h-3" />
                  Source Quote
                </div>
                <blockquote className="border-l-2 pl-3 italic text-muted-foreground">
                  "{field.source_quote}"
                </blockquote>
                {field.source_url && (
                  <a 
                    href={field.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View source
                  </a>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {editingField === field.id && (
              <div className="space-y-2 border-t pt-3">
                <div>
                  <label className="text-xs font-medium">New Value (JSON or plain text)</label>
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="font-mono text-sm mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Notes (optional)</label>
                  <Input
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Reason for modification..."
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleModify(field)}>
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setEditingField(null);
                      setEditValue('');
                      setReviewerNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Reviewer Notes */}
            {field.reviewer_notes && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <strong>Notes:</strong> {field.reviewer_notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
