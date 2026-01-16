/**
 * Fix Action Button Component
 * 
 * Renders actionable fix buttons that deep link to admin workflows
 * or trigger actions directly.
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
import type { ActionableFix, FixActionContext } from '@/lib/invariant/actionableFixes';

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
  fix: ActionableFix & { resolvedRoute?: string };
  context: FixActionContext;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
  size?: 'sm' | 'default' | 'lg';
  showDescription?: boolean;
}

export function FixActionButton({
  fix,
  context,
  onStatusChange,
  onRerunValidation,
  size = 'sm',
  showDescription = false,
}: FixActionButtonProps) {
  const navigate = useNavigate();
  
  const IconComponent = fix.icon ? ICON_MAP[fix.icon] : ExternalLink;
  
  const handleAction = () => {
    switch (fix.actionType) {
      case 'navigate':
      case 'navigate_with_field':
        if (fix.resolvedRoute) {
          navigate(fix.resolvedRoute);
        }
        break;
        
      case 'set_status':
        if (fix.targetStatus && onStatusChange) {
          onStatusChange(fix.targetStatus);
        }
        break;
        
      case 'rerun_validation':
        if (onRerunValidation) {
          onRerunValidation();
        }
        break;
        
      case 'invoke_function':
        // TODO: Implement edge function invocation
        console.log('Invoke function:', fix.functionName, fix.functionParams);
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
      className="justify-start"
    >
      {buttonContent}
    </Button>
  );
  
  // Wrap in confirmation dialog if needed
  if (fix.requiresConfirmation) {
    return (
      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                {button}
              </AlertDialogTrigger>
            </TooltipTrigger>
            {showDescription && (
              <TooltipContent>
                <p>{fix.description}</p>
              </TooltipContent>
            )}
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
  
  // Wrap in tooltip if showing description
  if (showDescription) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{fix.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return button;
}

interface FixActionListProps {
  fixes: Array<ActionableFix & { resolvedRoute?: string }>;
  context: FixActionContext;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
  layout?: 'horizontal' | 'vertical';
  maxVisible?: number;
}

export function FixActionList({
  fixes,
  context,
  onStatusChange,
  onRerunValidation,
  layout = 'vertical',
  maxVisible = 3,
}: FixActionListProps) {
  const visibleFixes = fixes.slice(0, maxVisible);
  const hiddenCount = fixes.length - visibleFixes.length;
  
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
