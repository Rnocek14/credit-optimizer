import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, BookOpen, Users, Briefcase, Target } from "lucide-react";

interface StepExecutionResultProps {
  result: any;
  actionType: string;
}

export function StepExecutionResult({ result, actionType }: StepExecutionResultProps) {
  if (!result) return null;

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'skill_gap_analysis':
        return <Target className="h-4 w-4" />;
      case 'market_check':
        return <Briefcase className="h-4 w-4" />;
      case 'learning_plan_creation':
        return <BookOpen className="h-4 w-4" />;
      case 'project_assignment':
        return <CheckCircle className="h-4 w-4" />;
      case 'network_building':
        return <Users className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const renderSkillGapAnalysis = (data: any) => (
    <div className="space-y-4">
      {data.skill_gaps && data.skill_gaps.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Identified Skill Gaps</h4>
          <div className="grid gap-2">
            {data.skill_gaps.map((gap: any, index: number) => (
              <div key={index} className="p-2 bg-orange-50 border border-orange-200 rounded">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{gap.skill}</span>
                  <Badge variant="outline" className="text-xs">
                    Priority: {gap.priority}
                  </Badge>
                </div>
                {gap.recommendation && (
                  <p className="text-xs text-muted-foreground mt-1">{gap.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.recommendations && (
        <div>
          <h4 className="font-medium text-sm mb-2">Recommendations</h4>
          <ul className="text-sm space-y-1">
            {data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderMarketCheck = (data: any) => {
    // Handle the case where data might be an array of source results from job market aggregator
    const marketData = Array.isArray(data) ? data : [data];
    
    return (
      <div className="space-y-4">
        {marketData.map((sourceData: any, sourceIndex: number) => (
          <div key={sourceIndex} className="space-y-3">
            {sourceData.source && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {sourceData.source}
                </Badge>
                {sourceData.success === false && (
                  <Badge variant="destructive" className="text-xs">
                    Failed
                  </Badge>
                )}
              </div>
            )}
            
            {sourceData.success === false ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">{sourceData.error}</p>
              </div>
            ) : (
              <>
                {sourceData.data?.jobCount && sourceData.data?.averageSalary && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-lg font-semibold text-green-800">
                        {sourceData.data.jobCount.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">Job Openings</div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-lg font-semibold text-blue-800">
                        ${sourceData.data.averageSalary?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-xs text-blue-600">Average Salary</div>
                    </div>
                  </div>
                )}

                {sourceData.data?.companies && sourceData.data.companies.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Top Companies Hiring</h4>
                    <div className="flex flex-wrap gap-2">
                      {sourceData.data.companies.slice(0, 5).map((company: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {sourceData.data?.skills && sourceData.data.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">In-Demand Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {sourceData.data.skills.slice(0, 6).map((skill: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {sourceData.data?.insights && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Market Insights</h4>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        {typeof sourceData.data.insights === 'string' 
                          ? sourceData.data.insights 
                          : JSON.stringify(sourceData.data.insights, null, 2)
                        }
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* Legacy format support */}
        {data.market_analysis && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-lg font-semibold text-green-800">
                {data.market_analysis.demand_score}/10
              </div>
              <div className="text-xs text-green-600">Market Demand</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-lg font-semibold text-blue-800">
                ${data.market_analysis.avg_salary?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-xs text-blue-600">Average Salary</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLearningPlan = (data: any) => (
    <div className="space-y-4">
      {data.learning_path && (
        <div>
          <h4 className="font-medium text-sm mb-2">Learning Path</h4>
          <div className="space-y-2">
            {data.learning_path.map((item: any, index: number) => (
              <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.duration || '1-2 weeks'}
                  </Badge>
                </div>
                {item.url && (
                  <Button size="sm" variant="outline" className="mt-2 h-6 text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Resource
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProjectAssignment = (data: any) => (
    <div className="space-y-4">
      {data.project && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded">
          <h4 className="font-medium mb-2">{data.project.title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{data.project.description}</p>
          
          {data.project.objectives && (
            <div>
              <div className="text-xs font-medium mb-1">Objectives:</div>
              <ul className="text-xs space-y-1">
                {data.project.objectives.map((obj: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Target className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <Badge variant="outline">{data.project.difficulty || 'Intermediate'}</Badge>
            <span className="text-xs text-muted-foreground">
              {data.project.duration || '2-4 weeks'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderNetworkBuilding = (data: any) => (
    <div className="space-y-4">
      {data.networking_strategies && (
        <div>
          <h4 className="font-medium text-sm mb-2">Networking Strategies</h4>
          <div className="space-y-2">
            {data.networking_strategies.map((strategy: any, index: number) => (
              <div key={index} className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="font-medium text-sm">{strategy.platform || strategy.title}</div>
                <div className="text-xs text-muted-foreground">{strategy.description}</div>
                {strategy.action && (
                  <div className="text-xs font-medium text-green-700 mt-1">
                    Next: {strategy.action}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.contacts && (
        <div>
          <h4 className="font-medium text-sm mb-2">Suggested Connections</h4>
          <div className="text-sm text-muted-foreground">
            Connect with professionals in your target industry through LinkedIn, industry events, and professional communities.
          </div>
        </div>
      )}
    </div>
  );

  const renderGenericResult = (data: any) => (
    <div className="space-y-2">
      <div className="text-sm">
        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );

  const renderResult = () => {
    switch (actionType) {
      case 'skill_gap_analysis':
        return renderSkillGapAnalysis(result);
      case 'market_check':
        return renderMarketCheck(result);
      case 'learning_plan_creation':
        return renderLearningPlan(result);
      case 'project_assignment':
        return renderProjectAssignment(result);
      case 'network_building':
        return renderNetworkBuilding(result);
      default:
        return renderGenericResult(result);
    }
  };

  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          {getActionIcon(actionType)}
          <span>Execution Result</span>
          <Badge variant="outline" className="text-xs">
            {new Date().toLocaleDateString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {renderResult()}
      </CardContent>
    </Card>
  );
}
