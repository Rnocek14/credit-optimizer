import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  id: string;
  label: string;
  emoji: string;
}

interface SalaryContributionModalProps {
  selectedCareerPathId: string;
  locations: Location[];
}

interface SalaryContributionData {
  career_path_id: string;
  location_id: string;
  experience_level: string;
  reported_salary: number;
  company_type?: string;
  notes?: string;
}

export const SalaryContributionModal: React.FC<SalaryContributionModalProps> = ({
  selectedCareerPathId,
  locations
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<SalaryContributionData>({
    career_path_id: selectedCareerPathId,
    location_id: '',
    experience_level: '',
    reported_salary: 0,
    company_type: '',
    notes: ''
  });
  const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitSalaryMutation = useMutation({
    mutationFn: async (data: SalaryContributionData) => {
      const { error } = await supabase
        .from('salary_insights')
        .insert({
          career_path_id: data.career_path_id,
          location_id: data.location_id,
          source: 'user',
          reported_salary: data.reported_salary,
          experience_level: data.experience_level,
          data_source: 'User Contribution',
          notes: data.notes || null
        });

      if (error) {
        console.error('Salary submission error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refresh salary insights data
      queryClient.invalidateQueries({ queryKey: ['salary-insights', selectedCareerPathId] });
      
      toast({
        title: "Thanks for contributing! 🎉",
        description: "Your salary data helps build transparency for everyone.",
      });
      
      // Reset form and close modal
      setFormData({
        career_path_id: selectedCareerPathId,
        location_id: '',
        experience_level: '',
        reported_salary: 0,
        company_type: '',
        notes: ''
      });
      setOpen(false);
      setLastSubmissionTime(Date.now());
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "Unable to save your salary data. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting - prevent submissions within 30 seconds
    const now = Date.now();
    if (now - lastSubmissionTime < 30000) {
      toast({
        title: "Please wait",
        description: "You can submit again in a few seconds.",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.location_id || !formData.experience_level || formData.reported_salary <= 0) {
      toast({
        title: "Invalid data",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    submitSalaryMutation.mutate(formData);
  };

  const isSubmitting = submitSalaryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          💬 Contribute Salary Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Share Your Salary Data
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select 
              value={formData.location_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.emoji} {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_level">Experience Level *</Label>
            <Select 
              value={formData.experience_level} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Entry">Entry Level</SelectItem>
                <SelectItem value="Mid">Mid Level</SelectItem>
                <SelectItem value="Senior">Senior Level</SelectItem>
                <SelectItem value="Lead">Lead Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Annual Salary (USD) *</Label>
            <Input
              id="salary"
              type="number"
              min="1"
              placeholder="e.g. 75000"
              value={formData.reported_salary || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                reported_salary: parseInt(e.target.value) || 0 
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_type">Company Type</Label>
            <Select 
              value={formData.company_type || ''} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, company_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Startup">Startup</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context about the role, benefits, etc. (optional)"
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-between items-center pt-4">
            <p className="text-xs text-muted-foreground">
              Your submission is anonymous and helps others make informed decisions.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};