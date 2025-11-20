import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '../types/templates';

interface ProvenanceWarningProps {
  template: MarketplaceDegreeTemplate;
  onDismiss: () => void;
}

export function ProvenanceWarning({ template, onDismiss }: ProvenanceWarningProps) {
  const lastVerifiedDate = new Date(template.lastVerified);
  const daysSinceVerification = Math.floor(
    (Date.now() - lastVerifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only show if template is >90 days old
  if (daysSinceVerification < 90) return null;

  return (
    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <div className="flex-1">
        <AlertTitle className="text-yellow-900 dark:text-yellow-100">
          Template May Be Outdated
        </AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          This template was last verified on {lastVerifiedDate.toLocaleDateString()} 
          ({daysSinceVerification} days ago). {template.anchorSchool} policies may have changed.
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-900 dark:text-yellow-100 border-yellow-500/30"
              asChild
            >
              <a
                href={`https://${template.anchorSchool.toLowerCase()}.edu`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Verify Current Policies
              </a>
            </Button>
          </div>
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-yellow-900 dark:text-yellow-100"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
