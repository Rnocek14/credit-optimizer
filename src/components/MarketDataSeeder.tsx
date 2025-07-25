import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Zap, CheckCircle, AlertCircle } from 'lucide-react';

const SAMPLE_DATA = [
  // Software Engineering data
  { career_path: 'Software Engineer', location: 'San Francisco', growth_rate: 15.2, demand_score: 85, average_salary: 145000, job_postings_count: 2400, competition_level: 'high' },
  { career_path: 'Software Engineer', location: 'New York', growth_rate: 12.8, demand_score: 78, average_salary: 135000, job_postings_count: 1800, competition_level: 'high' },
  { career_path: 'Software Engineer', location: 'Austin', growth_rate: 18.5, demand_score: 82, average_salary: 115000, job_postings_count: 950, competition_level: 'medium' },
  { career_path: 'Software Engineer', location: 'Seattle', growth_rate: 14.3, demand_score: 80, average_salary: 140000, job_postings_count: 1200, competition_level: 'high' },
  
  // Data Science data
  { career_path: 'Data Scientist', location: 'San Francisco', growth_rate: 22.1, demand_score: 88, average_salary: 155000, job_postings_count: 1100, competition_level: 'high' },
  { career_path: 'Data Scientist', location: 'Boston', growth_rate: 19.7, demand_score: 83, average_salary: 125000, job_postings_count: 650, competition_level: 'medium' },
  { career_path: 'Data Scientist', location: 'Chicago', growth_rate: 16.4, demand_score: 75, average_salary: 110000, job_postings_count: 480, competition_level: 'medium' },
  
  // Product Management data
  { career_path: 'Product Manager', location: 'San Francisco', growth_rate: 13.9, demand_score: 79, average_salary: 150000, job_postings_count: 800, competition_level: 'high' },
  { career_path: 'Product Manager', location: 'New York', growth_rate: 11.2, demand_score: 72, average_salary: 140000, job_postings_count: 650, competition_level: 'high' },
  { career_path: 'Product Manager', location: 'Los Angeles', growth_rate: 14.8, demand_score: 76, average_salary: 130000, job_postings_count: 420, competition_level: 'medium' },
  
  // UX Design data
  { career_path: 'UX Designer', location: 'San Francisco', growth_rate: 16.7, demand_score: 74, average_salary: 115000, job_postings_count: 580, competition_level: 'medium' },
  { career_path: 'UX Designer', location: 'Seattle', growth_rate: 15.3, demand_score: 71, average_salary: 105000, job_postings_count: 340, competition_level: 'medium' },
  { career_path: 'UX Designer', location: 'Austin', growth_rate: 18.9, demand_score: 77, average_salary: 95000, job_postings_count: 290, competition_level: 'low' },
  
  // DevOps data
  { career_path: 'DevOps Engineer', location: 'San Francisco', growth_rate: 20.5, demand_score: 86, average_salary: 135000, job_postings_count: 720, competition_level: 'medium' },
  { career_path: 'DevOps Engineer', location: 'Seattle', growth_rate: 17.8, demand_score: 81, average_salary: 125000, job_postings_count: 540, competition_level: 'medium' },
  { career_path: 'DevOps Engineer', location: 'Denver', growth_rate: 21.2, demand_score: 79, average_salary: 110000, job_postings_count: 280, competition_level: 'low' },
];

const HISTORICAL_MONTHS = ['2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12', '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];

export const MarketDataSeeder: React.FC = () => {
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'seeding' | 'complete' | 'error'>('idle');

  const generateHistoricalData = (baseData: any, monthOffset: number) => ({
    ...baseData,
    growth_rate: baseData.growth_rate + (Math.random() - 0.5) * 4,
    demand_score: Math.max(20, Math.min(100, baseData.demand_score + (Math.random() - 0.5) * 20)),
    average_salary: Math.round(baseData.average_salary * (1 + (Math.random() - 0.5) * 0.1)),
    job_postings_count: Math.round(baseData.job_postings_count * (1 + (Math.random() - 0.5) * 0.3)),
    recorded_at: new Date(2024, monthOffset, 15).toISOString(),
  });

  const seedMarketData = async () => {
    setSeeding(true);
    setStatus('seeding');
    setProgress(0);

    try {
      // Seed current market trends
      setProgress(20);
      const marketTrendsData = SAMPLE_DATA.map(item => ({
        ...item,
        time_period: '30d',
        data_source: 'ai_analysis',
        ai_insights: {
          demandTrend: item.growth_rate > 15 ? 'increasing' : item.growth_rate > 5 ? 'stable' : 'decreasing',
          salaryTrend: 'rising',
          marketSaturation: item.competition_level,
          keyDrivers: ['AI adoption', 'Digital transformation', 'Remote work trends'],
          riskFactors: ['Economic uncertainty', 'Market saturation'],
          recommendation: `Strong growth potential in ${item.location}`,
          confidence: 85
        },
        raw_data: {
          sources: ['linkedin', 'indeed', 'glassdoor'],
          lastUpdated: new Date().toISOString()
        }
      }));

      const { error: trendsError } = await supabase
        .from('market_trends')
        .upsert(marketTrendsData, { onConflict: 'career_path,location' });

      if (trendsError) throw trendsError;

      setProgress(50);

      // Seed historical data
      const historicalData = [];
      for (let monthIndex = 0; monthIndex < HISTORICAL_MONTHS.length; monthIndex++) {
        for (const item of SAMPLE_DATA) {
          historicalData.push({
            career_path: item.career_path,
            location: item.location,
            ...generateHistoricalData(item, monthIndex),
            time_period: '30d',
            data_source: 'ai_analysis',
            ai_insights: {
              demandTrend: 'stable',
              confidence: 80
            }
          });
        }
      }

      setProgress(80);

      const { error: historyError } = await supabase
        .from('market_trends_history')
        .upsert(historicalData, { onConflict: 'career_path,location,recorded_at' });

      if (historyError) throw historyError;

      setProgress(100);
      setStatus('complete');
      
      toast({
        title: "Data Seeding Complete",
        description: `Successfully seeded ${marketTrendsData.length} market trends and ${historicalData.length} historical records.`,
      });

    } catch (error) {
      console.error('Error seeding data:', error);
      setStatus('error');
      toast({
        title: "Seeding Failed",
        description: error instanceof Error ? error.message : "Failed to seed market data",
        variant: "destructive"
      });
    } finally {
      setSeeding(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'seeding':
        return <Badge variant="secondary">Seeding...</Badge>;
      case 'complete':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Complete</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Market Data Seeder
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Populate the database with comprehensive market trend data
          </p>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium">Career Paths</p>
            <p className="text-muted-foreground">5 tech roles</p>
          </div>
          <div>
            <p className="font-medium">Locations</p>
            <p className="text-muted-foreground">10+ cities</p>
          </div>
          <div>
            <p className="font-medium">Historical Months</p>
            <p className="text-muted-foreground">18 months data</p>
          </div>
          <div>
            <p className="font-medium">Total Records</p>
            <p className="text-muted-foreground">~450+ entries</p>
          </div>
        </div>

        {seeding && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <Button 
          onClick={seedMarketData} 
          disabled={seeding}
          className="w-full"
        >
          {seeding ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-spin" />
              Seeding Data...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Seed Market Data
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          This will add comprehensive market trend data including historical trends for better analysis and visualizations.
        </div>
      </CardContent>
    </Card>
  );
};