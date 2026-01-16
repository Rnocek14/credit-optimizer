/**
 * Fix Action Button Component
 * 
 * Renders actionable fix buttons that deep link to admin workflows
 * or trigger actions directly.
 * 
 * Handles:
 * - Navigation to admin pages
 * - Status changes with confirmation
 * - Re-run validation
 * - Disabled state for unresolved placeholders
 * - Toast feedback for missing handlers
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Clock,
  Calculator,
  RefreshCw,
  List,
  FileText,
  Building,
  Edit,
  Settings,
  PieChart,
  Layers,
  ArrowRightLeft,
  Users,
  BarChart,
  GraduationCap,
  HelpCircle,
  Plus,
  AlertCircle,
  Copy,
  GitBranch,
  BookOpen,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import type { ResolvedFix, FixActionContext } from '@/lib/invariant/actionableFixes';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Clock,
  Calculator,
  RefreshCw,
  List,
  FileText,
  Building,
  Edit,
  Settings,
  PieChart,
  Layers,
  ArrowRightLeft,
  Users,
  BarChart,
  GraduationCap,
  HelpCircle,
  Plus,
  AlertCircle,
  Copy,
  GitBranch,
  BookOpen,
  MessageCircle,
  ExternalLink,
};

interface FixActionButtonProps {
  fix: ResolvedFix;
  context: FixActionContext;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
  size?: 'sm' | 'default' | 'lg';
  showDescription?: boolean;
}

export function FixActionButton({
  fix,
  onStatusChange,
  onRerunValidation,
  size = 'sm',
  showDescription = false,
}: FixActionButtonProps) {
  const navigate = useNavigate();
  
  const IconComponent = fix.icon ? ICON_MAP[fix.icon] : ExternalLink;
  
  // Determine if button should be disabled
  const isDisabled = fix.hasUnresolvedPlaceholders && 
    (fix.actionType === 'navigate' || fix.actionType === 'navigate_with_field');
  
  // Build tooltip text
  const getTooltipText = () => {
    if (isDisabled && fix.missingContextFields.length > 0) {
      return `Missing context: ${fix.missingContextFields.join(', ')}`;
    }
    return fix.description;
  };
  
  const handleAction = () => {
    switch (fix.actionType) {
      case 'navigate':
      case 'navigate_with_field':
        if (fix.resolvedRoute && !fix.hasUnresolvedPlaceholders) {
          navigate(fix.resolvedRoute);
        } else if (fix.hasUnresolvedPlaceholders) {
          toast({
            title: 'Navigation unavailable',
            description: `Missing required context: ${fix.missingContextFields.join(', ')}`,
            variant: 'destructive',
          });
        }
        break;
        
      case 'set_status':
        if (fix.targetStatus) {
          if (onStatusChange) {
            onStatusChange(fix.targetStatus);
          } else {
            toast({
              title: 'Action unavailable',
              description: 'Status change handler not configured for this view.',
              variant: 'destructive',
            });
          }
        }
        break;
        
      case 'rerun_validation':
        if (onRerunValidation) {
          onRerunValidation();
        } else {
          toast({
            title: 'Action unavailable',
            description: 'Re-validation handler not configured for this view.',
            variant: 'destructive',
          });
        }
        break;
        
      case 'invoke_function':
        // TODO: Implement edge function invocation
        toast({
          title: 'Coming soon',
          description: 'Direct function invocation is not yet implemented.',
        });
        break;
    }
  };
  
  const buttonContent = (
    <>
      {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
      {fix.label}
    </>
  );
  
  const button = (
    <Button
      variant={fix.variant ?? 'outline'}
      size={size}
      onClick={fix.requiresConfirmation ? undefined : handleAction}
      disabled={isDisabled}
      className="justify-start"
    >
      {buttonContent}
    </Button>
  );
  
  // Always wrap in tooltip for disabled state or description
  const tooltipText = getTooltipText();
  
  // Wrap in confirmation dialog if needed
  if (fix.requiresConfirmation && !isDisabled) {
    return (
      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                {button}
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {fix.confirmationMessage ?? 'Are you sure you want to proceed?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
  // Wrap in tooltip if showing description or disabled
  if (showDescription || isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p className={isDisabled ? 'text-destructive' : ''}>
              {tooltipText}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return button;
}

interface FixActionListProps {
  fixes: ResolvedFix[];
  context: FixActionContext;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
  layout?: 'horizontal' | 'vertical';
  maxVisible?: number;
  hideUnresolved?: boolean;
}

export function FixActionList({
  fixes,
  context,
  onStatusChange,
  onRerunValidation,
  layout = 'vertical',
  maxVisible = 3,
  hideUnresolved = false,
}: FixActionListProps) {
  // Optionally filter out unresolved fixes
  const filteredFixes = hideUnresolved
    ? fixes.filter(fix => !fix.hasUnresolvedPlaceholders)
    : fixes;
  
  const visibleFixes = filteredFixes.slice(0, maxVisible);
  const hiddenCount = filteredFixes.length - visibleFixes.length;
  
  // Don't render if no visible fixes
  if (visibleFixes.length === 0) {
    return null;
  }
  
  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'} gap-2`}>
      {visibleFixes.map((fix) => (
        <FixActionButton
          key={fix.id}
          fix={fix}
          context={context}
          onStatusChange={onStatusChange}
          onRerunValidation={onRerunValidation}
          showDescription
        />
      ))}
      
      {hiddenCount > 0 && (
        <span className="text-sm text-muted-foreground self-center">
          +{hiddenCount} more actions
        </span>
      )}
    </div>
  );
}
