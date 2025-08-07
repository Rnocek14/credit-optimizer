import { useState } from 'react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { AIUsageViewer } from './AIUsageViewer';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, actions } = useUnifiedData();

  const handleTestAction = (action: string) => {
    switch (action) {
      case 'setCareerPath':
        actions.setSelectedCareerPath('data-analyst');
        break;
      case 'setLocation':
        actions.setSelectedLocation('remote');
        break;
      case 'setGoal':
        actions.setCurrentGoal('land-entry-role');
        break;
      case 'refreshData':
        actions.refreshAllData();
        break;
      case 'clearErrors':
        // actions.clearErrors(); // TODO: Add this action
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur"
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[900px] max-w-[90vw] max-h-[80vh] overflow-auto">
      <Card className="bg-background/95 backdrop-blur border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug Panel
            </CardTitle>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <Tabs defaultValue="state" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="state">App State</TabsTrigger>
              <TabsTrigger value="usage">AI Usage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="state" className="space-y-4">
          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="font-medium">Quick Tests:</h4>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => handleTestAction('setCareerPath')}>
                Set Career
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestAction('setLocation')}>
                Set Location
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestAction('setGoal')}>
                Set Goal
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTestAction('refreshData')}>
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Context State */}
          <div className="space-y-2">
            <h4 className="font-medium">Context:</h4>
            <div className="grid grid-cols-1 gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Career:</span>
                <Badge variant="secondary">{state.selectedCareerPath || 'none'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <Badge variant="secondary">{state.selectedLocation || 'none'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal:</span>
                <Badge variant="secondary">{state.currentGoal || 'none'}</Badge>
              </div>
            </div>
          </div>

          {/* Loading States */}
          <div className="space-y-2">
            <h4 className="font-medium">Loading States:</h4>
            <div className="space-y-1">
              {Object.entries(state.loading).map(([key, loading]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground">{key}:</span>
                  <Badge variant={loading ? "default" : "outline"}>
                    {loading ? 'Loading...' : 'Idle'}
                  </Badge>
                </div>
              ))}
              {Object.keys(state.loading).length === 0 && (
                <span className="text-muted-foreground">No loading states</span>
              )}
            </div>
          </div>

          {/* Error States */}
          <div className="space-y-2">
            <h4 className="font-medium">Errors:</h4>
            <div className="space-y-1">
              {Object.entries(state.errors).filter(([, error]) => error).map(([key, error]) => (
                <div key={key} className="space-y-1">
                  <span className="text-muted-foreground">{key}:</span>
                  <Badge variant="destructive" className="break-all text-xs">
                    {error}
                  </Badge>
                </div>
              ))}
              {Object.values(state.errors).every(error => !error) && (
                <span className="text-muted-foreground">No errors</span>
              )}
            </div>
          </div>

          {/* Data Status */}
          <div className="space-y-2">
            <h4 className="font-medium">Data Status:</h4>
            <div className="grid grid-cols-1 gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Career Data:</span>
                <Badge variant={state.careerData ? "default" : "outline"}>
                  {state.careerData ? 'Loaded' : 'Empty'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Data:</span>
                <Badge variant={state.marketData ? "default" : "outline"}>
                  {state.marketData ? `${Array.isArray(state.marketData) ? state.marketData.length : 1} items` : 'Empty'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Readiness:</span>
                <Badge variant={state.readinessData ? "default" : "outline"}>
                  {state.readinessData ? 'Loaded' : 'Empty'}
                </Badge>
              </div>
            </div>
          </div>
            </TabsContent>
            
            <TabsContent value="usage" className="mt-4">
              <AIUsageViewer />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}