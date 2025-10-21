import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlanBasket } from '../state/usePlanBasket';
import { toast } from '@/hooks/use-toast';
import { Save, Trash2, Download } from 'lucide-react';

export function ScenarioManager() {
  const scenarios = usePlanBasket(s => s.scenarios);
  const saveScenario = usePlanBasket(s => s.saveScenario);
  const loadScenario = usePlanBasket(s => s.loadScenario);
  const deleteScenario = usePlanBasket(s => s.deleteScenario);
  
  const [saveName, setSaveName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleSave = () => {
    const id = saveScenario(saveName);
    const displayName = saveName.trim() || `Plan – ${new Date().toLocaleDateString()}`;
    
    toast({
      title: '✓ Scenario Saved',
      description: `"${displayName}" saved successfully`,
    });
    
    setSaveName('');
    setSaveDialogOpen(false);
  };

  const handleLoad = (id: string, name: string) => {
    loadScenario(id);
    toast({
      title: '✓ Scenario Loaded',
      description: `"${name}" restored to plan`,
    });
  };

  const handleDelete = (id: string, name: string) => {
    deleteScenario(id);
    toast({
      title: '✓ Scenario Deleted',
      description: `"${name}" removed`,
      variant: 'destructive',
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Saved Scenarios ({scenarios.length}/20)
          </CardTitle>
          
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Save className="h-3 w-3 mr-1" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Plan name (optional)"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated name (e.g., "Plan – {new Date().toLocaleDateString()}")
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {scenarios.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No saved scenarios yet. Add courses to your plan and click "Save Current" to create one.
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex items-start gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" title={scenario.name}>
                      {scenario.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {scenario.items.length} courses • ${scenario.totals.totalCost.toLocaleString()} • {scenario.totals.totalWeeks}wks
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(scenario.createdAt).toLocaleDateString()} at {new Date(scenario.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoad(scenario.id, scenario.name)}
                      title="Replace current plan with this scenario"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Delete this scenario"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Scenario?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{scenario.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(scenario.id, scenario.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
