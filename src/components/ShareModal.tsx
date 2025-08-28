import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Share2, Twitter, Linkedin, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  scoreBucket: string;
  insights: string[];
}

export function ShareModal({ isOpen, onClose, referralCode, scoreBucket, insights }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const shareUrl = referralCode ? `${window.location.origin}/share/${referralCode}` : '';
  const shareText = `I just got my career readiness assessment! Check out this quick diagnosis tool.`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with friends to help them get their career diagnosis.",
      });
      
      trackTelemetryEvent({
        task: 'share_link_copied',
        route: '/quick-start',
        complexity: { method: 'clipboard', referral_code: referralCode }
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive"
      });
    }
  };

  const handleSocialShare = (platform: string) => {
    trackTelemetryEvent({
      task: 'share_social_clicked',
      route: '/quick-start',
      complexity: { platform, referral_code: referralCode }
    });

    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'strong': return 'bg-success text-success-foreground';
      case 'growing': return 'bg-warning text-warning-foreground';
      case 'emerging': return 'bg-info text-info-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Results
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <Badge className={`px-3 py-1 ${getBucketColor(scoreBucket)}`}>
              {scoreBucket.charAt(0).toUpperCase() + scoreBucket.slice(1)} Career Readiness
            </Badge>
            <p className="text-sm text-muted-foreground">
              Help others discover their career potential with this quick assessment
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={!referralCode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Share on Social</label>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSocialShare('twitter')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Twitter className="w-4 h-4" />
                Twitter
              </Button>
              <Button
                onClick={() => handleSocialShare('linkedin')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </Button>
              <Button
                onClick={() => handleSocialShare('facebook')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            When someone completes their assessment through your link, you'll both get bonus insights!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}