/**
 * SharePlanDialog - Generate shareable link for degree plan
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PlanNode } from '../types/v4';

interface SharePlanDialogProps {
  planNodes: PlanNode[];
}

export const SharePlanDialog: React.FC<SharePlanDialogProps> = ({ planNodes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generateShareLink = () => {
    // Generate unique plan ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Store plan in localStorage (in production, use Supabase)
    const planSnapshot = {
      id: planId,
      nodes: planNodes,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`eduplan_${planId}`, JSON.stringify(planSnapshot));
    
    // Generate shareable URL
    const url = `${window.location.origin}/edu-tree-v4?plan=${planId}`;
    setShareUrl(url);
    
    toast.success('Share link generated!');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !shareUrl) {
      generateShareLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Share2 className="h-4 w-4 mr-2" />
          Share Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Degree Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with advisors or colleagues to review your degree plan.
          </p>
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              placeholder="Generating link..."
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              disabled={!shareUrl}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Note: This link will be valid for viewing the plan snapshot.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
