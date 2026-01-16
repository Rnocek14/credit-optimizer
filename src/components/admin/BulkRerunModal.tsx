/**
 * Bulk Rerun Confirmation Modal
 * 
 * Requires user to type confirmation string before starting bulk rerun.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface BulkRerunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: 'block' | 'warn';
  templateCount: number;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function BulkRerunModal({
  open,
  onOpenChange,
  decision,
  templateCount,
  onConfirm,
  isLoading = false,
}: BulkRerunModalProps) {
  const [confirmText, setConfirmText] = useState('');
  
  const expectedConfirm = decision === 'block' 
    ? 'BULK_RERUN_BLOCK_TEMPLATES' 
    : 'BULK_RERUN_WARN_TEMPLATES';
  
  const isConfirmValid = confirmText === expectedConfirm;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    await onConfirm();
    setConfirmText('');
  };

  const handleClose = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Bulk Rerun
          </DialogTitle>
          <DialogDescription>
            This will re-evaluate invariants for{' '}
            <strong className="text-foreground">{templateCount}</strong>{' '}
            templates with <strong className="text-foreground">{decision.toUpperCase()}</strong> status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-muted-foreground mt-1">
              New snapshots will be created for all matched templates.
              This may take several minutes depending on the number of templates.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-input">
              Type <code className="px-1 py-0.5 bg-muted rounded text-xs">{expectedConfirm}</code> to confirm:
            </Label>
            <Input
              id="confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirm}
              className="font-mono"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Bulk Rerun'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
