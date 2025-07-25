import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Building2, Users, DollarSign, TrendingUp, AlertTriangle, Briefcase } from "lucide-react";
import { useEnhancedMarketIntelligence } from "@/hooks/useEnhancedMarketIntelligence";

interface RealTimeJobDataPanelProps {
  careerPath?: string;
  location?: string;
  autoData?: any;
  autoTrigger?: boolean;
}

export function RealTimeJobDataPanel({ careerPath, location, autoData, autoTrigger }: RealTimeJobDataPanelProps) {
  const { fetchRealTimeJobData, loadingJobData, jobDataError } = useEnhancedMarketIntelligence();
  const [jobData, setJobData] = useState<any>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Auto-populate data when provided from comprehensive analysis
  useEffect(() => {
    if (autoData && autoTrigger) {
      console.log('🔥 Auto-populating real-time job data:', autoData);
      setJobData(autoData);
    }
  }, [autoData, autoTrigger]);

  const handleFetchJobData = async () => {
    console.log('📡 Fetch Job Data clicked:', { careerPath, location });
    
    if (!careerPath || !location) {
      console.warn('❌ Missing required data:', { careerPath, location });
      return;
    }
    
    const result = await fetchRealTimeJobData(careerPath, location);
    console.log('💼 Job data result:', result);
    
    if (result && result.length > 0) {
      setJobData(result);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'linkedin': return '💼';
      case 'indeed': return '🔍';
      case 'glassdoor': return '🏢';
      default: return '📊';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'linkedin': return 'bg-blue-500';
      case 'indeed': return 'bg-green-500';
      case 'glassdoor': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredData = selectedSource === 'all' 
    ? jobData 
    : jobData?.filter((item: any) => item.source.toLowerCase() === selectedSource);

  const calculateTotals = () => {
    if (!jobData || !Array.isArray(jobData)) return { totalJobs: 0, avgSalary: 0, topCompanies: [], topSkills: [] };
    
    const successfulSources = jobData.filter((item: any) => item.success);
    const totalJobs = successfulSources.reduce((sum: number, item: any) => sum + (item.data?.jobCount || 0), 0);
    const avgSalary = successfulSources.length > 0 
      ? Math.floor(successfulSources.reduce((sum: number, item: any) => sum + (item.data?.averageSalary || 0), 0) / successfulSources.length)
      : 0;
    
    const allCompanies = successfulSources.flatMap((item: any) => item.data?.companies || []);
    const allSkills = successfulSources.flatMap((item: any) => item.data?.skills || []);
    
    const topCompanies = [...new Set(allCompanies)].slice(0, 8);
    const topSkills = [...new Set(allSkills)].slice(0, 10);

    return { totalJobs, avgSalary, topCompanies, topSkills };
  };

  const totals = calculateTotals();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Real-Time Job Market Data
        </CardTitle>
        <CardDescription>
          Live job posting data aggregated from multiple sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-center">
          <Button 
            onClick={handleFetchJobData}
            disabled={loadingJobData || !careerPath || !location}
            className="flex-shrink-0"
          >
            {loadingJobData ? 'Fetching...' : (autoData && autoTrigger ? 'Refresh Live Data' : 'Fetch Live Data')}
          </Button>
          
          {jobData && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedSource === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSource('all')}
              >
                All Sources
              </Button>
              {jobData.map((item: any) => (
                <Button
                  key={item.source}
                  variant={selectedSource === item.source.toLowerCase() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(item.source.toLowerCase())}
                  className="flex items-center gap-1"
                >
                  {getSourceIcon(item.source)}
                  {item.source}
                </Button>
              ))}
            </div>
          )}
        </div>

        {jobDataError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{jobDataError}</AlertDescription>
          </Alert>
        )}

        {jobData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{totals.totalJobs.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Jobs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">${totals.avgSalary.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Avg. Salary</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{totals.topCompanies.length}</p>
                      <p className="text-sm text-muted-foreground">Top Companies</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{jobData.filter((item: any) => item.success).length}</p>
                      <p className="text-sm text-muted-foreground">Active Sources</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Source Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Source Breakdown</h3>
              {(filteredData || jobData).map((item: any, index: number) => (
                <Card key={index} className={`${!item.success ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getSourceColor(item.source)}`} />
                        {getSourceIcon(item.source)} {item.source}
                      </div>
                      {item.success ? (
                        <Badge variant="outline" className="text-success border-success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  
                  {item.success ? (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Job Count</p>
                          <p className="font-semibold">{item.data.jobCount?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg. Salary</p>
                          <p className="font-semibold">${item.data.averageSalary?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Updated</p>
                          <p className="font-semibold text-xs">
                            {item.data.lastFetched ? new Date(item.data.lastFetched).toLocaleTimeString() : 'Now'}
                          </p>
                        </div>
                      </div>

                      {item.data.insights && (
                        <Alert>
                          <AlertDescription className="text-sm">
                            {item.data.insights}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {item.data.companies?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Top Hiring Companies</p>
                            <div className="flex flex-wrap gap-1">
                              {item.data.companies.slice(0, 5).map((company: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {company}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.data.skills?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Required Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {item.data.skills.slice(0, 6).map((skill: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {item.error || 'Failed to fetch data from this source'}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Aggregated Skills & Companies */}
            {totals.topSkills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market-Wide Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Most In-Demand Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {totals.topSkills.map((skill: string, index: number) => (
                        <Badge key={index} variant="default" className="bg-primary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Top Hiring Companies</p>
                    <div className="flex flex-wrap gap-2">
                      {totals.topCompanies.map((company: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}