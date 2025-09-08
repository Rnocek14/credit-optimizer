import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Clock, Trophy, Target } from 'lucide-react';
import { ParetoPoint, analyzeTradoffs } from '@/lib/pathfinding/pareto-frontier';

interface ParetoFrontierPanelProps {
  frontier: ParetoPoint[];
  onSelectPath: (path: ParetoPoint) => void;
  selectedPathId?: string;
}

export function ParetoFrontierPanel({ 
  frontier, 
  onSelectPath, 
  selectedPathId 
}: ParetoFrontierPanelProps) {
  const [sortBy, setSortBy] = useState<'time' | 'cost' | 'credits' | 'roi'>('roi');
  
  const tradeoffs = useMemo(() => analyzeTradoffs(frontier), [frontier]);
  
  const scatterData = useMemo(() => {
    return frontier.map(point => ({
      name: point.name,
      time: point.metrics.time,
      cost: point.metrics.cost,
      credits: point.metrics.credits,
      roi: point.metrics.roi,
      id: point.id,
      isSelected: point.id === selectedPathId
    }));
  }, [frontier, selectedPathId]);

  const sortedFrontier = useMemo(() => {
    return [...frontier].sort((a, b) => {
      const aVal = a.metrics[sortBy];
      const bVal = b.metrics[sortBy];
      
      // ROI and credits should be descending (higher is better)
      if (['roi', 'credits'].includes(sortBy)) {
        return bVal - aVal;
      }
      // Time and cost should be ascending (lower is better)
      return aVal - bVal;
    });
  }, [frontier, sortBy]);

  const getBadgeVariant = (path: ParetoPoint) => {
    if (path.id === selectedPathId) return 'default';
    
    // Determine what this path is best at
    const isFastest = frontier.every(p => p.metrics.time >= path.metrics.time);
    const isCheapest = frontier.every(p => p.metrics.cost >= path.metrics.cost);
    const isHighestROI = frontier.every(p => p.metrics.roi <= path.metrics.roi);
    const isMostCredits = frontier.every(p => p.metrics.credits <= path.metrics.credits);
    
    if (isFastest) return 'secondary';
    if (isCheapest) return 'outline';
    if (isHighestROI) return 'destructive';
    if (isMostCredits) return 'secondary';
    return 'outline';
  };

  const getBadgeLabel = (path: ParetoPoint) => {
    const isFastest = frontier.every(p => p.metrics.time >= path.metrics.time);
    const isCheapest = frontier.every(p => p.metrics.cost >= path.metrics.cost);
    const isHighestROI = frontier.every(p => p.metrics.roi <= path.metrics.roi);
    const isMostCredits = frontier.every(p => p.metrics.credits <= path.metrics.credits);
    
    if (isFastest) return 'FASTEST';
    if (isCheapest) return 'CHEAPEST';
    if (isHighestROI) return 'BEST ROI';
    if (isMostCredits) return 'MAX CREDITS';
    return 'EFFICIENT';
  };

  if (frontier.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No Pareto frontier data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Pareto Frontier Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Efficient paths that optimize different objectives. No path dominates these options.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="scatter" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scatter">Visual Analysis</TabsTrigger>
            <TabsTrigger value="table">Detailed Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scatter" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    name="Time (months)"
                    label={{ value: 'Time (months)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="cost" 
                    name="Cost ($)"
                    label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'time' ? `${value} months` : `$${Number(value).toLocaleString()}`,
                      name === 'time' ? 'Duration' : 'Total Cost'
                    ]}
                  />
                  <Scatter 
                    name="Efficient Paths" 
                    dataKey="cost"
                    fill="hsl(var(--primary))"
                    onClick={(data) => {
                      const point = frontier.find(p => p.id === data.id);
                      if (point) onSelectPath(point);
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-medium">Time vs Cost</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Correlation: {(tradeoffs.timeVsCost.correlation * 100).toFixed(0)}%
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-medium">ROI vs Difficulty</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Correlation: {(tradeoffs.roiVsDifficulty.correlation * 100).toFixed(0)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="table" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <div className="flex gap-1">
                {(['time', 'cost', 'credits', 'roi'] as const).map(metric => (
                  <Button
                    key={metric}
                    variant={sortBy === metric ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(metric)}
                    className="min-h-8"
                  >
                    {metric === 'time' && <Clock className="w-3 h-3 mr-1" />}
                    {metric === 'cost' && <DollarSign className="w-3 h-3 mr-1" />}
                    {metric === 'credits' && <Trophy className="w-3 h-3 mr-1" />}
                    {metric === 'roi' && <TrendingUp className="w-3 h-3 mr-1" />}
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFrontier.map(path => (
                    <TableRow key={path.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{path.name}</span>
                          <Badge variant={getBadgeVariant(path)} className="text-xs">
                            {getBadgeLabel(path)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{path.metrics.time} months</TableCell>
                      <TableCell>${path.metrics.cost.toLocaleString()}</TableCell>
                      <TableCell>{path.metrics.credits} credits</TableCell>
                      <TableCell>{path.metrics.roi.toFixed(1)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={path.id === selectedPathId ? 'default' : 'outline'}
                          onClick={() => onSelectPath(path)}
                          className="min-h-8"
                        >
                          {path.id === selectedPathId ? 'Selected' : 'Select'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}