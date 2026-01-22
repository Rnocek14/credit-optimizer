import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InstitutionFormData {
  code: string;
  name: string;
  type: 'university' | 'college' | 'online';
  institution_tier: 'tier_a' | 'tier_b' | 'tier_c';
  catalog_base_url: string;
  admin_notes: string;
}

export default function AddInstitution() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<InstitutionFormData>({
    code: '',
    name: '',
    type: 'university',
    institution_tier: 'tier_c',
    catalog_base_url: '',
    admin_notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InstitutionFormData) => {
      // Normalize code to uppercase
      const normalizedCode = data.code.toUpperCase().trim();
      
      // 1. Check if institution already exists
      const { data: existing } = await supabase
        .from('institutions')
        .select('code')
        .eq('code', normalizedCode)
        .maybeSingle();
      
      if (existing) {
        throw new Error(`Institution ${normalizedCode} already exists`);
      }
      
      // 2. Insert institution
      const { error: insertError } = await supabase
        .from('institutions')
        .insert({
          code: normalizedCode,
          name: data.name,
          type: data.type,
          institution_tier: data.institution_tier,
          catalog_base_url: data.catalog_base_url || null,
          admin_notes: data.admin_notes || null,
          discovery_status: 'pending',
        });
      
      if (insertError) throw insertError;
      
      // 3. Create draft policy pack (using RPC to avoid type issues)
      const { error: packError } = await supabase
        .from('institution_policy_packs')
        .insert([{
          institution: normalizedCode,
          academic_year: '2024-2025',
          degree_level: 'undergraduate',
          status: 'draft',
          policy_data: {},
          policy_json: {},
          confidence_score: 0,
          completeness_score: 0,
          has_ground_truth: false,
        }]);
      
      if (packError) {
        console.warn('Failed to create draft pack:', packError);
        // Don't throw - institution was created successfully
      }
      
      return normalizedCode;
    },
    onSuccess: (code) => {
      toast.success(`Institution ${code} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['policy-packs'] });
      // Navigate to field review with institution pre-selected
      navigate(`/admin/policy-field-review?institution=${code}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create institution: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast.error('Institution code is required');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Institution name is required');
      return;
    }
    
    createMutation.mutate(formData);
  };

  const updateField = <K extends keyof InstitutionFormData>(
    field: K, 
    value: InstitutionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link 
          to="/admin/policy-pack-pipeline" 
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add New Institution
          </CardTitle>
          <CardDescription>
            Register a new institution to begin the policy extraction pipeline.
            This will create a draft policy pack ready for URL seeding and extraction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Institution Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Institution Code *</Label>
              <Input
                id="code"
                placeholder="e.g., SNHU, UMGC, ASU"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                className="uppercase"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Short unique identifier (uppercase). Used throughout the system.
              </p>
            </div>

            {/* Institution Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Southern New Hampshire University"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Institution Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => updateField('type', v as InstitutionFormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="online">Online Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <Label htmlFor="tier">Onboarding Tier</Label>
              <Select 
                value={formData.institution_tier} 
                onValueChange={(v) => updateField('institution_tier', v as InstitutionFormData['institution_tier'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier_a">Tier A (High Priority)</SelectItem>
                  <SelectItem value="tier_b">Tier B (Medium Priority)</SelectItem>
                  <SelectItem value="tier_c">Tier C (Standard)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tier A institutions are processed first during batch operations.
              </p>
            </div>

            {/* Catalog URL */}
            <div className="space-y-2">
              <Label htmlFor="catalog_url">Catalog Base URL</Label>
              <Input
                id="catalog_url"
                type="url"
                placeholder="https://catalog.university.edu"
                value={formData.catalog_base_url}
                onChange={(e) => updateField('catalog_base_url', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Starting point for policy URL discovery (optional).
              </p>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any notes about this institution's onboarding..."
                value={formData.admin_notes}
                onChange={(e) => updateField('admin_notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Institution
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/policy-pack-pipeline')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Next Steps Info */}
      <Card className="mt-6 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. <strong>Add Scrape URLs</strong> - Seed catalog/transfer policy page URLs</p>
          <p>2. <strong>Build Pack</strong> - AI extracts policy fields from URLs</p>
          <p>3. <strong>Review Fields</strong> - Approve/override extracted values</p>
          <p>4. <strong>Promote Pack</strong> - Activate for template generation</p>
          <p>5. <strong>Enable V1</strong> - Add to V1 scope (after 50%+ evidence coverage)</p>
        </CardContent>
      </Card>
    </div>
  );
}
