import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Brain } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MarketAlert {
  id: string;
  type: 'demand_spike' | 'salary_increase' | 'skill_obsolescence' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: number;
  confidence: number;
  actionItems: string[];
  timestamp: Date;
  data: any;
}

interface MarketTrend {
  field: string;
  changePercent: number;
  timeframe: string;
  direction: 'up' | 'down' | 'stable';
  confidence: number;
}

export function RealTimeMarketIntelligence() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');

  useEffect(() => {
    // Initialize with Phase 5 market intelligence data
    const initialAlerts: MarketAlert[] = [
      {
        id: '1',
        type: 'demand_spike',
        severity: 'high',
        title: 'Machine Learning Engineer Demand Surge',
        description: 'ML Engineer positions increased 23.4% this month with average salary boost of $15K',
        impact: 0.89,
        confidence: 0.94,
        actionItems: [
          'Accelerate skill development in TensorFlow/PyTorch',
          'Update resume with ML keywords',
          'Apply for remote ML positions'
        ],
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        data: {
          field: 'machine_learning',
          growth_rate: 23.4,
          salary_increase: 15000,
          job_postings_increase: 67
        }
      },
      {
        id: '2',
        type: 'skill_obsolescence',
        severity: 'medium',
        title: 'Traditional Analytics Skills Declining',
        description: 'Traditional analytics approaches declining 12%. ML-powered analytics becoming standard',
        impact: 0.67,
        confidence: 0.87,
        actionItems: [
          'Learn ML analytics frameworks',
          'Practice with real-time data processing',
          'Develop AI-powered dashboard skills'
        ],
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        data: {
          skill: 'traditional_analytics',
          decline_rate: -12,
          replacement_skills: ['ml_analytics', 'ai_insights']
        }
      },
      {
        id: '3',
        type: 'opportunity',
        severity: 'high',
        title: 'Remote Work Premium Increasing',
        description: 'Remote ML roles offering 34% salary premium over on-site positions',
        impact: 0.92,
        confidence: 0.91,
        actionItems: [
          'Optimize for remote work skills',
          'Build portfolio demonstrating remote collaboration',
          'Network with remote-first companies'
        ],
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        data: {
          location: 'remote',
          salary_premium: 34,
          trend_duration: '3_months'
        }
      }
    ];

    const initialTrends: MarketTrend[] = [
      { field: 'Machine Learning', changePercent: 23.4, timeframe: '30d', direction: 'up', confidence: 0.94 },
      { field: 'Data Science', changePercent: 12.1, timeframe: '30d', direction: 'up', confidence: 0.89 },
      { field: 'Traditional Analytics', changePercent: -12.0, timeframe: '30d', direction: 'down', confidence: 0.87 },
      { field: 'DevOps/MLOps', changePercent: 18.7, timeframe: '30d', direction: 'up', confidence: 0.92 },
      { field: 'Remote Work Skills', changePercent: 34.2, timeframe: '30d', direction: 'up', confidence: 0.91 }
    ];

    setAlerts(initialAlerts);
    setTrends(initialTrends);

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isMonitoring && Math.random() > 0.7) {
        simulateMarketUpdate();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const simulateMarketUpdate = () => {
    const updateTypes = ['trend_update', 'new_alert', 'alert_update'];
    const updateType = updateTypes[Math.floor(Math.random() * updateTypes.length)];

    switch (updateType) {
      case 'trend_update':
        setTrends(prev => prev.map(trend => ({
          ...trend,
          changePercent: trend.changePercent + (Math.random() - 0.5) * 2,
          confidence: Math.min(0.99, Math.max(0.7, trend.confidence + (Math.random() - 0.5) * 0.1))
        })));
        break;

      case 'new_alert':
        const newAlert: MarketAlert = {
          id: Date.now().toString(),
          type: 'demand_spike',
          severity: 'medium',
          title: 'New Market Opportunity Detected',
          description: 'Emerging trend in AI specialization showing promising growth',
          impact: 0.75 + Math.random() * 0.2,
          confidence: 0.8 + Math.random() * 0.15,
          actionItems: [
            'Research the emerging technology',
            'Assess skill gap',
            'Create learning plan'
          ],
          timestamp: new Date(),
          data: { field: 'ai_specialization', growth_rate: 15 + Math.random() * 10 }
        };
        
        setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
        
        toast({
          title: "New Market Alert",
          description: newAlert.title,
        });
        break;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast({
      title: "Alert Acknowledged",
      description: "Alert has been processed and removed",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'demand_spike': return <TrendingUp className="w-4 h-4" />;
      case 'salary_increase': return <Target className="w-4 h-4" />;
      case 'skill_obsolescence': return <TrendingDown className="w-4 h-4" />;
      case 'opportunity': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Real-Time Market Intelligence</h2>
              <p className="text-sm text-muted-foreground">Phase 5: AI-Powered Market Monitoring & Alerts</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={isMonitoring ? "default" : "secondary"}>
                {isMonitoring ? 'Monitoring' : 'Paused'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">
            Alerts ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="trends">
            Market Trends ({trends.length})
          </TabsTrigger>
          <TabsTrigger value="insights">
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No active alerts.
                  <br />
                  Maya is monitoring the market for opportunities and threats.
                </p>
              </CardContent>
            </Card>
          ) : (
            alerts.map(alert => (
              <Card key={alert.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(alert.type)}
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Impact: {Math.round(alert.impact * 100)}%</span>
                        <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                        <span>{alert.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {alert.actionItems.map((action, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4">
            {trends.map((trend, index) => (
              <Card key={index}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(trend.direction)}
                    <div>
                      <p className="font-medium">{trend.field}</p>
                      <p className="text-sm text-muted-foreground">
                        {trend.timeframe} • {Math.round(trend.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      trend.direction === 'up' ? 'text-success' : 
                      trend.direction === 'down' ? 'text-destructive' : 
                      'text-muted-foreground'
                    }`}>
                      {trend.direction === 'up' ? '+' : ''}
                      {trend.changePercent.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">change</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Maya's Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border">
                <h4 className="font-medium mb-2">Key Market Insight</h4>
                <p className="text-sm text-muted-foreground">
                  The ML engineering field is experiencing unprecedented growth. Remote positions are 
                  commanding significant salary premiums, suggesting a shift in work patterns that 
                  favors distributed teams and specialized expertise.
                </p>
              </div>
              
              <div className="p-4 bg-secondary/5 rounded-lg border">
                <h4 className="font-medium mb-2">Strategic Recommendation</h4>
                <p className="text-sm text-muted-foreground">
                  Focus on developing MLOps and remote collaboration skills. The convergence of these 
                  trends creates a unique opportunity for professionals who can bridge technical ML 
                  expertise with distributed team leadership.
                </p>
              </div>

              <div className="p-4 bg-accent/5 rounded-lg border">
                <h4 className="font-medium mb-2">Risk Assessment</h4>
                <p className="text-sm text-muted-foreground">
                  Traditional analytics skills are becoming commoditized. Professionals relying solely 
                  on conventional data analysis approaches may find their market value declining within 
                  the next 18 months.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}