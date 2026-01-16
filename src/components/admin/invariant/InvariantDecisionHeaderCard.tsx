/**
 * Invariant Decision Header Card
 * 
 * Displays template metadata, decision badge, snapshot info, and job link.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Building,
  GraduationCap,
  Layers,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ADMIN_ROUTES } from '@/lib/invariant/actionableFixes';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface Template {
  id: string;
  institution_code: string;
  program_slug: string;
  track: string;
  generated_at: string | null;
  template_status?: string;
}

interface Snapshot {
  id: string;
  job_id: string | null;
  template_status: string;
  invariant_version: string;
  effective_config: Record<string, unknown>;
  decision: 'pass' | 'warn' | 'block';
  violation_codes: string[];
  created_at: string;
}

interface Job {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface InvariantDecisionHeaderCardProps {
  template: Template;
  snapshot: Snapshot | null;
  job: Job | null;
  className?: string;
}

// ============================================
// HELPERS
// ============================================

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function DecisionBadge({ decision }: { decision: 'pass' | 'warn' | 'block' | null }) {
  if (!decision) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }

  switch (decision) {
    case 'pass':
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </Badge>
      );
    case 'warn':
      return (
        <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
          <AlertTriangle className="h-3 w-3" />
          Warn
        </Badge>
      );
    case 'block':
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Block
        </Badge>
      );
  }
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;
  
  const variants: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    draft: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    pending_review: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    archived: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={cn('capitalize', variants[status] || '')}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// ============================================
// COMPONENT
// ============================================

export function InvariantDecisionHeaderCard({
  template,
  snapshot,
  job,
  className,
}: InvariantDecisionHeaderCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Template Invariant Details
              <DecisionBadge decision={snapshot?.decision ?? null} />
            </CardTitle>
            <CardDescription className="mt-1">
              Evaluation snapshot and configuration details
            </CardDescription>
          </div>
          
          {/* Template Status */}
          <StatusBadge status={snapshot?.template_status || template.template_status} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Template Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Template</h4>
            
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{template.institution_code}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{template.program_slug}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{template.track}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">ID:</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {template.id.substring(0, 8)}...
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(template.id, 'Template ID')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          {/* Snapshot Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Snapshot</h4>
            
            {snapshot ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Version:</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    {snapshot.invariant_version}
                  </code>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(snapshot.created_at)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Violations:</span>
                  <span className="font-medium">{snapshot.violation_codes.length}</span>
                </div>

                {/* Job link */}
                {job && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`${ADMIN_ROUTES.generationJobs}?job_id=${job.id}`}>
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        View Job ({job.status})
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No snapshot recorded yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
