/**
 * PlanSelector — Shows active plan name, switch, create CTA.
 * Lives at the top of the V5 board so users always know context.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  program_id: string;
  is_active: boolean;
}

interface PlanSelectorProps {
  activePlanId: string | null;
  onPlanChange: (planId: string) => void;
}

export function PlanSelector({ activePlanId, onPlanChange }: PlanSelectorProps) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  // Fetch all user plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['edutree', 'user-plans-list'],
    queryFn: async (): Promise<Plan[]> => {
      const user = await getCurrentUser();
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_plans')
        .select('id, name, program_id, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const activePlan = plans.find(p => p.id === activePlanId);

  // Create new plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error('Not authenticated');

      const name = `My Plan ${plans.length + 1}`;
      const { data, error } = await supabase
        .from('user_plans')
        .insert({
          user_id: user.id,
          program_id: 'default',
          name,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id, name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['edutree', 'user-plans-list'] });
      queryClient.invalidateQueries({ queryKey: ['edutree', 'active-plan'] });
      onPlanChange(result.id);
      toast.success(`Created "${result.name}"`);
      setCreating(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create plan: ${err.message}`);
      setCreating(false);
    },
  });

  // ── No plan state ──
  if (!isLoading && plans.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
        <FileText className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">No degree plan yet</p>
          <p className="text-xs text-muted-foreground">Create one to start building your degree</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setCreating(true);
            createPlanMutation.mutate();
          }}
          disabled={creating}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create Plan
        </Button>
      </div>
    );
  }

  // ── Plan selector ──
  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            {activePlan?.name ?? 'Select Plan'}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {plans.map(plan => (
            <DropdownMenuItem
              key={plan.id}
              onClick={() => onPlanChange(plan.id)}
              className={plan.id === activePlanId ? 'bg-accent' : ''}
            >
              {plan.name}
              {plan.id === activePlanId && (
                <span className="ml-2 text-xs text-primary">Active</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCreating(true);
              createPlanMutation.mutate();
            }}
            disabled={creating}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
