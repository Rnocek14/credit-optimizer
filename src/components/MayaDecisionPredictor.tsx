import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, TrendingUp, Target } from 'lucide-react';
import { useProactiveDecisions } from '@/hooks/useProactiveDecisions';

export function MayaDecisionPredictor() {
  const { decisions, loading, generateProactiveDecisions } = useProactiveDecisions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Proactive Decision Intelligence
        </h3>
        <Button onClick={generateProactiveDecisions} disabled={loading}>
          Generate Decisions
        </Button>
      </div>

      {decisions.map((decision) => (
        <Card key={decision.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {decision.title}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={decision.urgency === 'high' ? 'destructive' : 'default'}>
                  {decision.urgency} urgency
                </Badge>
                <Badge variant="outline">{Math.round(decision.confidence * 100)}% confident</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{decision.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decision.options.map((option) => (
                <div key={option.id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{option.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-green-600">Pros:</span>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {option.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-red-600">Cons:</span>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {option.cons.map((con, i) => <li key={i}>{con}</li>)}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm space-y-1">
                      <div>Impact: <span className="text-blue-600">{Math.round(option.expectedOutcome.careerImpact * 100)}%</span></div>
                      <div>Success: <span className="text-green-600">{Math.round(option.expectedOutcome.successProbability * 100)}%</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              {decision.timeWindow}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}