import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  CheckCircle, XCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp, 
  AlertTriangle, Edit2, Eye, Shield, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ExtractedField {
  value: string | number;
  unit?: string;
  evidence_text?: string;
  evidence_url?: string;
  evidence_locator?: string;
  confidence?: number;
}

interface PolicyFinding {
  id: string;
  institution: string;
  academic_year: string | null;
  status: string;
  reason: string;
  urls_scanned: string[] | null;
  confidence_score: number | null;
  details: Record<string, unknown> | null;
  requires_verification: boolean;
  extracted_values: Record<string, ExtractedField> | null;
  verified_values: Record<string, ExtractedField> | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

interface Institution {
  code: string;
  name: string;
  institution_tier: string;
  discovery_status: string;
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge variant="outline">No score</Badge>;
  const pct = Math.round(score * 100);
  const colorClass = pct >= 85 ? 'bg-green-500/20 text-green-600' : pct >= 60 ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>{pct}%</span>;
}

function EvidenceCard({ 
  fieldName, 
  field, 
  onEdit,
  editMode,
  editValue,
  onEditChange
}: { 
  fieldName: string; 
  field: ExtractedField;
  onEdit: () => void;
  editMode: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
}) {
  const hasEvidence = !!field.evidence_text || !!field.evidence_url;
  
  return (
    <div className={`p-3 rounded-lg border ${hasEvidence ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{fieldName.replace(/_/g, ' ')}</span>
          {hasEvidence ? (
            <span title="Has evidence"><Shield className="h-3.5 w-3.5 text-green-500" /></span>
          ) : (
            <span title="Missing evidence"><AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /></span>
          )}
          <ConfidenceBadge score={field.confidence} />
        </div>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={onEdit}>
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        {editMode ? (
          <Input 
            value={editValue} 
            onChange={(e) => onEditChange(e.target.value)}
            className="h-8 text-lg font-bold w-32"
          />
        ) : (
          <span className="text-lg font-bold">{field.value}</span>
        )}
        {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
      </div>
      
      {field.evidence_text && (
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
          <p className="text-xs bg-muted p-2 rounded italic">"{field.evidence_text}"</p>
        </div>
      )}
      
      {field.evidence_locator && (
        <p className="text-xs text-muted-foreground mb-1">
          <FileText className="h-3 w-3 inline mr-1" />
          {field.evidence_locator}
        </p>
      )}
      
      {field.evidence_url && (
        <a 
          href={field.evidence_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          View source
        </a>
      )}
    </div>
  );
}

function FindingCard({ 
  finding, 
  onVerify, 
  onSkip, 
  loading 
}: { 
  finding: PolicyFinding;
  onVerify: (id: string, verifiedValues: Record<string, ExtractedField>) => void;
  onSkip: (id: string, reason: string) => void;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  
  const extractedValues = finding.extracted_values || {};
  const fields = Object.entries(extractedValues);
  
  // Check if all fields have evidence
  const allHaveEvidence = fields.every(([_, field]) => 
    field.evidence_text && field.evidence_url
  );
  
  // Check if required numeric fields exist
  const hasResidency = extractedValues.residency_credits?.value != null;
  const hasMaxTransfer = extractedValues.max_transfer_credits?.value != null;
  const canVerify = hasResidency && hasMaxTransfer && allHaveEvidence;
  
  const handleFieldEdit = (fieldName: string) => {
    const currentValue = extractedValues[fieldName]?.value?.toString() || '';
    setEditingFields(prev => ({ ...prev, [fieldName]: currentValue }));
    setEditMode(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };
  
  const handleVerify = () => {
    // Build verified values from extracted + any edits
    const verified: Record<string, ExtractedField> = {};
    for (const [key, field] of fields) {
      verified[key] = {
        ...field,
        value: editMode[key] && editingFields[key] ? 
          (isNaN(Number(editingFields[key])) ? editingFields[key] : Number(editingFields[key])) : 
          field.value
      };
    }
    onVerify(finding.id, verified);
  };

  return (
    <Card className={`border-l-4 ${canVerify ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-semibold">{finding.institution}</span>
              {finding.academic_year && <Badge variant="outline">{finding.academic_year}</Badge>}
              <Badge variant={finding.status === 'skip' ? 'secondary' : 'outline'}>{finding.status}</Badge>
              {canVerify ? (
                <Badge className="bg-green-500/20 text-green-600">Ready to verify</Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-600">Missing required data</Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {finding.reason}
            </p>
            
            <p className="text-xs text-muted-foreground">
              Created {new Date(finding.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded view with evidence */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Field evidence cards */}
            {fields.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {fields.map(([fieldName, field]) => (
                  <EvidenceCard
                    key={fieldName}
                    fieldName={fieldName}
                    field={field}
                    onEdit={() => handleFieldEdit(fieldName)}
                    editMode={editMode[fieldName] || false}
                    editValue={editingFields[fieldName] || ''}
                    onEditChange={(val) => setEditingFields(prev => ({ ...prev, [fieldName]: val }))}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No extracted values found</p>
                {finding.details && (
                  <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto max-h-32 text-left">
                    {JSON.stringify(finding.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            {/* URLs scanned */}
            {finding.urls_scanned && finding.urls_scanned.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">URLs Scanned:</p>
                <div className="flex flex-wrap gap-1">
                  {finding.urls_scanned.map((url, i) => (
                    <a 
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(url).pathname.slice(0, 30)}...
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={loading || !canVerify}
                className="gap-1"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Verify & Create GT
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSkip(finding.id, 'program_scoped')}
                disabled={loading}
                className="gap-1"
              >
                Skip (Program-scoped)
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSkip(finding.id, 'missing_source')}
                disabled={loading}
                className="gap-1"
              >
                Skip (No source)
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onSkip(finding.id, 'rejected')}
                disabled={loading}
                className="gap-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Main Panel
// -----------------------------------------------------------------------------

export function VerificationQueuePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [findings, setFindings] = useState<PolicyFinding[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('tier_a');

  const loadInstitutions = async () => {
    const { data, error } = await supabase
      .from('institutions')
      .select('code, name, institution_tier, discovery_status')
      .order('name');
    
    if (!error && data) {
      setInstitutions(data as Institution[]);
    }
  };

  const loadFindings = async () => {
    setLoading(true);
    try {
      // Load findings that require verification
      const { data, error } = await (supabase as any)
        .from('policy_scan_findings')
        .select('*')
        .eq('requires_verification', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFindings(data || []);
    } catch (e) {
      console.error('Error loading findings:', e);
      toast({ title: 'Failed to load verification queue', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
    loadFindings();
  }, []);

  const handleVerify = async (id: string, verifiedValues: Record<string, ExtractedField>) => {
    setLoading(true);
    try {
      // Update the finding with verified values
      const { error: updateError } = await (supabase as any)
        .from('policy_scan_findings')
        .update({
          requires_verification: false,
          verified_values: verifiedValues,
          verified_by: 'admin',
          verified_at: new Date().toISOString(),
          status: 'verified'
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Get the finding to create GT
      const finding = findings.find(f => f.id === id);
      if (finding && verifiedValues.residency_credits && verifiedValues.max_transfer_credits) {
        // Create ground truth entry
        const { error: gtError } = await (supabase as any)
          .from('institution_policy_ground_truth')
          .insert({
            institution_code: finding.institution,
            academic_year: finding.academic_year || '2024-25',
            residency_credits: Number(verifiedValues.residency_credits.value),
            max_transfer_credits: Number(verifiedValues.max_transfer_credits.value),
            verification_source: 'human_verified',
            notes: `Verified from policy scan finding ${id}`,
          });

        if (gtError) {
          console.error('GT creation error:', gtError);
          toast({ title: 'Verified but GT creation failed', description: gtError.message, variant: 'destructive' });
        } else {
          toast({ title: 'Verified & GT Created', description: `Ground truth created for ${finding.institution}` });
        }
      }

      await loadFindings();
    } catch (e) {
      console.error('Error verifying:', e);
      toast({ title: 'Verification failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async (id: string, reason: string) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('policy_scan_findings')
        .update({
          requires_verification: false,
          status: reason,
          reason: `Skipped: ${reason}`
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Finding skipped', description: `Marked as ${reason}` });
      await loadFindings();
    } catch (e) {
      console.error('Error skipping:', e);
      toast({ title: 'Skip failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter by tier
  const tierInstitutionCodes = institutions
    .filter(i => i.institution_tier === selectedTier)
    .map(i => i.code);

  const filteredFindings = findings.filter(f => 
    selectedTier === 'all' || tierInstitutionCodes.includes(f.institution)
  );

  const tierCounts = {
    tier_a: institutions.filter(i => i.institution_tier === 'tier_a').length,
    tier_b: institutions.filter(i => i.institution_tier === 'tier_b').length,
    tier_c: institutions.filter(i => i.institution_tier === 'tier_c').length,
  };

  return (
    <div className="space-y-4">
      {/* Institution Tier Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Verification Queue</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{findings.length} pending</Badge>
              <Button size="sm" variant="ghost" onClick={loadFindings} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Filter by tier:</span>
            <Button 
              size="sm" 
              variant={selectedTier === 'tier_a' ? 'default' : 'outline'}
              onClick={() => setSelectedTier('tier_a')}
            >
              Tier A ({tierCounts.tier_a})
            </Button>
            <Button 
              size="sm" 
              variant={selectedTier === 'tier_b' ? 'default' : 'outline'}
              onClick={() => setSelectedTier('tier_b')}
            >
              Tier B ({tierCounts.tier_b})
            </Button>
            <Button 
              size="sm" 
              variant={selectedTier === 'tier_c' ? 'default' : 'outline'}
              onClick={() => setSelectedTier('tier_c')}
            >
              Tier C ({tierCounts.tier_c})
            </Button>
            <Button 
              size="sm" 
              variant={selectedTier === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedTier('all')}
            >
              All
            </Button>
          </div>
          
          {/* Institution Status Grid */}
          <div className="grid grid-cols-5 gap-2">
            {institutions
              .filter(i => selectedTier === 'all' || i.institution_tier === selectedTier)
              .slice(0, 20)
              .map(inst => (
                <div 
                  key={inst.code}
                  className={`p-2 rounded border text-xs ${
                    inst.discovery_status === 'active' ? 'border-green-500/50 bg-green-500/10' :
                    inst.discovery_status === 'gt_verified' ? 'border-blue-500/50 bg-blue-500/10' :
                    inst.discovery_status === 'templates_ready' ? 'border-yellow-500/50 bg-yellow-500/10' :
                    'border-border'
                  }`}
                >
                  <div className="font-medium">{inst.code}</div>
                  <div className="text-muted-foreground truncate">{inst.discovery_status}</div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>

      {/* Findings List */}
      <div className="space-y-3">
        {loading && findings.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        ) : filteredFindings.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No findings require verification
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onVerify={handleVerify}
              onSkip={handleSkip}
              loading={loading}
            />
          ))
        )}
      </div>
    </div>
  );
}
