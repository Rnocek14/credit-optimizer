/**
 * ExportPlanButton - Export plan as PDF with compliance report
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanNode, ValidationResult, DegreeRequirements } from '../types/v4';
import { ComplianceMetrics } from '../engine/CreditPolicyEngine';
import { generatePDF } from '../engine/pdfGenerator';

interface ExportPlanButtonProps {
  planNodes: PlanNode[];
  validation: ValidationResult;
  complianceMetrics: ComplianceMetrics;
  requirements: DegreeRequirements;
}

export const ExportPlanButton: React.FC<ExportPlanButtonProps> = ({
  planNodes,
  validation,
  complianceMetrics,
  requirements
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const exportPlan = async () => {
    if (!studentName.trim()) {
      toast.error('Please enter student name');
      return;
    }

    setIsExporting(true);
    
    try {
      await generatePDF({
        studentName,
        planNodes,
        validation,
        complianceMetrics,
        requirements
      });

      toast.success('Plan exported successfully!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to export plan:', error);
      toast.error('Failed to export plan. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Degree Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="studentName">Student Name</Label>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter student name"
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Export includes:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>Compliance score & policy summary</li>
              <li>Module-by-module breakdown</li>
              <li>Policy violations & warnings</li>
              <li>Florida articulation mappings</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={exportPlan}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
