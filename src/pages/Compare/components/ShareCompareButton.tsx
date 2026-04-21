/**
 * ShareCompareButton — copy-current-URL share affordance.
 * Falls back from native share sheet → clipboard.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareCompareButtonProps {
  /** Optional context text used in the share sheet */
  shareTitle?: string;
}

export function ShareCompareButton({
  shareTitle = 'My degree comparison on Pivot',
}: ShareCompareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;

    // Try native share sheet first (mobile + some desktop browsers)
    const navAny = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof navAny.share === 'function') {
      try {
        await navAny.share({ title: shareTitle, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Paste it anywhere to share this comparison.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Couldn't copy",
        description: 'Copy the URL from your address bar instead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </Button>
  );
}
