/**
 * CareerTargetPicker — lightweight dialog for changing the user's target career.
 * Uses DAL functions — no direct supabase imports.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Search, Briefcase } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchCareerOptions, updatePlanTargetCareer } from '@/shared/lib/api/careerTarget';
import type { CareerOption } from '@/shared/lib/api/careerTarget';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface CareerTargetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  currentCareerId?: string | null;
}

export function CareerTargetPicker({
  open,
  onOpenChange,
  planId,
  currentCareerId,
}: CareerTargetPickerProps) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: careers = [], isLoading } = useQuery({
    queryKey: ['career-paths-picker'],
    queryFn: fetchCareerOptions,
    enabled: open,
    staleTime: 10 * 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (careerId: string | null) => updatePlanTargetCareer(planId, careerId),
    onSuccess: (_data, careerId) => {
      queryClient.invalidateQueries({ queryKey: ['edutree', 'active-plan'] });
      queryClient.invalidateQueries({ queryKey: ['target-career'] });
      queryClient.invalidateQueries({ queryKey: ['cri-score'] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'intelligence' });

      const selected = careers.find((c) => c.id === careerId);
      toast.success(
        careerId
          ? `Target career updated to ${selected?.title ?? 'new career'}`
          : 'Target career cleared',
      );
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to update target career');
    },
  });

  const filtered = careers.filter(
    (c) => c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Target Career</DialogTitle>
          <DialogDescription>
            Your recommendations and readiness score will align to this career.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search careers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Briefcase className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No careers found</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {filtered.map((career) => (
                <button
                  key={career.id}
                  onClick={() => updateMutation.mutate(career.id)}
                  disabled={updateMutation.isPending}
                  className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent/50 transition-colors disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{career.title}</p>
                  </div>
                  {career.id === currentCareerId && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {currentCareerId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => updateMutation.mutate(null)}
            disabled={updateMutation.isPending}
          >
            Clear target career
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
