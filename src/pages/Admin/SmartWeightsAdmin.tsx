import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PreviewWeightsModal from './PreviewWeightsModal';
import type { WeightsRow } from '@/lib/analytics/useSmartWeights';

export default function SmartWeightsAdmin() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<WeightsRow | null>(null);

  const { data: weights = [], isLoading, error } = useQuery({
    queryKey: ['smart-weights'],
    queryFn: async () => {
      // @ts-ignore - Table will be available after running SQL migration
      const { data, error } = await supabase
        // @ts-ignore
        .from('smart_rank_weights')
        .select('*')
        .order('activated_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeightsRow[];
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      // Deactivate all current active rows
      // @ts-ignore - Table will be available after running SQL migration
      const { error: e1 } = await supabase
        // @ts-ignore
        .from('smart_rank_weights')
        // @ts-ignore
        .update({ active: false })
        .eq('active', true);
      if (e1) throw e1;

      // Activate selected row
      // @ts-ignore - Table will be available after running SQL migration
      const { error: e2 } = await supabase
        // @ts-ignore
        .from('smart_rank_weights')
        // @ts-ignore
        .update({ active: true, activated_at: new Date().toISOString() })
        .eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-weights'] });
      toast.success('Weights activated successfully');
    },
    onError: (err) => {
      console.error('Failed to activate weights:', err);
      toast.error('Failed to activate weights');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (row: WeightsRow) => {
      const { id, active, created_at, activated_at, ...rest } = row;
      const newRow: any = {
        ...rest,
        active: false,
        notes: `Cloned from v${row.version} (ID #${id})`,
        version: row.version + 1,
      };
      // @ts-ignore - Table will be available after running SQL migration
      const { error } = await supabase
        // @ts-ignore
        .from('smart_rank_weights')
        .insert(newRow);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-weights'] });
      toast.success('Weights cloned successfully');
    },
    onError: (err) => {
      console.error('Failed to clone weights:', err);
      toast.error('Failed to clone weights');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Error Loading Weights</h2>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Failed to load smart ranking weights'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activeWeights = weights.find((w) => w.active);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Re-Ranker Weights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and configure template ranking weights for A/B testing
        </p>
      </div>

      {/* Active Weights Card */}
      {activeWeights && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Active Weights (v{activeWeights.version})</CardTitle>
                <CardDescription>
                  Currently applied to Bucket B templates
                </CardDescription>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Bias:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.bias.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cost:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_cost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Weeks:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_weeks.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CRI:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_cri.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Transfer OK:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_transfer_ok.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ACE:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_provider_ace.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CLEP:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_provider_clep.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">NCCRS:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_provider_nccrs.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Exploratory:</span>
                <span className="ml-2 font-mono font-semibold">{activeWeights.w_exploratory_bonus.toFixed(2)}</span>
              </div>
            </div>
            {activeWeights.notes && (
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Notes:</strong> {activeWeights.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weights History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Weights History</CardTitle>
          <CardDescription>All weight configurations (current and historical)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weights.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">v{w.version}</TableCell>
                  <TableCell>
                    {w.active ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {w.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                    >
                      {expandedId === w.id ? 'Hide' : 'View'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cloneMutation.mutate(w)}
                      disabled={cloneMutation.isPending}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Clone
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreview(w)}
                    >
                      Preview
                    </Button>
                    {!w.active && (
                      <Button
                        size="sm"
                        onClick={() => activateMutation.mutate(w.id)}
                        disabled={activateMutation.isPending}
                      >
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {expandedId !== null && weights.find((w) => w.id === expandedId) && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-muted/50">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs p-2">
                      {Object.entries(weights.find((w) => w.id === expandedId)!)
                        .filter(([k]) => k.startsWith('w_') || k === 'bias')
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="ml-2 font-mono font-semibold">
                              {typeof value === 'number' ? value.toFixed(2) : value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <PreviewWeightsModal
        weights={preview!}
        open={!!preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
