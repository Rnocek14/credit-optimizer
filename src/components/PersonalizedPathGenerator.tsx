import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  Target, 
  Zap, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Route,
  Sparkles,
  CheckCircle,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';

interface PersonalizedPathGeneratorProps {
  userId: string;
  onPathGenerated?: (path: any) => void;
}

interface PathRequest {
  targetRole: string;
  timeframe: 'fast' | 'balanced' | 'thorough';
  budget: 'free' | 'low' | 'medium' | 'high';
  focus: 'practical' | 'theoretical' | 'balanced';
  currentSkills: string[];
  learningStyle: string;
  additionalRequirements: string;
}

interface GeneratedPath {
  id: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  totalCost: number;
  successProbability: number;
  personalizationScore: number;
  nodes: Array<{
    id: string;
    title: string;
    type: string;
    estimatedWeeks: number;
    cost: number;
    difficulty: number;
    personalizedReason: string;
    prerequisites: string[];
    marketRelevance: number;
  }>;
  mayaInsights: {
    recommendation: string;
    strengths: string[];
    challenges: string[];
    tips: string[];
  };
}

export function PersonalizedPathGenerator({ userId, onPathGenerated }: PersonalizedPathGeneratorProps) {
  const [request, setRequest] = useState<PathRequest>({
    targetRole: '',
    timeframe: 'balanced',
    budget: 'medium',
    focus: 'practical',
    currentSkills: [],
    learningStyle: 'mixed',
    additionalRequirements: ''
  });
  const [generatedPaths, setGeneratedPaths] = useState<GeneratedPath[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPath, setSelectedPath] = useState<GeneratedPath | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();
  const { sendEnhancedRequest, loading: mayaLoading } = useEnhancedMaya();

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserProfile(data);
        // Pre-populate from profile
        setRequest(prev => ({
          ...prev,
          currentSkills: data.skill_assessments?.map((s: any) => s.skillName) || [],
          learningStyle: getPrimaryLearningStyle(data.learning_style)
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const getPrimaryLearningStyle = (learningStyle: any) => {
    if (!learningStyle) return 'mixed';
    
    const styles = Object.entries(learningStyle) as [string, number][];
    const primary = styles.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    
    return primary[0];
  };

  const generatePersonalizedPath = async () => {
    if (!request.targetRole.trim()) {
      toast({
        title: "Missing Information",
        description: "Please specify your target role",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🎯 Generating personalized learning path...');

      // Use Maya AI for enhanced path generation
      const mayaResponse = await sendEnhancedRequest(
        `Create a highly personalized learning path for becoming a ${request.targetRole}. 

        User Context:
        - Current Skills: ${request.currentSkills.join(', ') || 'Beginner level'}
        - Timeframe Preference: ${request.timeframe}
        - Budget: ${request.budget}
        - Learning Focus: ${request.focus}
        - Primary Learning Style: ${request.learningStyle}
        - Available Hours/Week: ${userProfile?.available_hours_per_week || 10}
        - Additional Requirements: ${request.additionalRequirements || 'None'}

        Please generate 3 different path options (fast-track, balanced, comprehensive) with:
        1. Detailed step-by-step learning nodes
        2. Personalized reasoning for each recommendation
        3. Time and cost estimates
        4. Skills gap analysis
        5. Market-relevant content prioritization
        6. Success probability assessment
        7. Specific tips based on their learning style

        Include Maya's insights on strengths, potential challenges, and learning optimization tips.`,
        {
          careerPath: request.targetRole,
          goals: [{ target_role: request.targetRole }],
          skillLevel: request.currentSkills.length
        }
      );

      if (mayaResponse) {
        // Parse Maya's response and create structured paths
        const mockPaths = generateMockPaths(request, mayaResponse);
        setGeneratedPaths(mockPaths);
        setSelectedPath(mockPaths[0]);

        toast({
          title: "Paths Generated",
          description: `Created ${mockPaths.length} personalized learning paths`,
        });

        onPathGenerated?.(mockPaths[0]);
      }

    } catch (error) {
      console.error('Error generating path:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate personalized path. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockPaths = (request: PathRequest, mayaResponse: any): GeneratedPath[] => {
    // This would normally parse Maya's structured response
    // For now, generating realistic mock data
    
    const baseWeeks = request.timeframe === 'fast' ? 12 : request.timeframe === 'balanced' ? 24 : 36;
    const baseCost = request.budget === 'free' ? 0 : request.budget === 'low' ? 200 : request.budget === 'medium' ? 800 : 2000;
    
    return [
      {
        id: 'fast-track',
        title: `Fast-Track ${request.targetRole} Path`,
        description: 'Intensive, practical-focused path for quick skill acquisition',
        estimatedWeeks: Math.round(baseWeeks * 0.7),
        totalCost: Math.round(baseCost * 0.8),
        successProbability: 75,
        personalizationScore: 85,
        nodes: [
          {
            id: 'foundation',
            title: `${request.targetRole} Fundamentals`,
            type: 'course',
            estimatedWeeks: 3,
            cost: Math.round(baseCost * 0.2),
            difficulty: 2,
            personalizedReason: `Tailored to your ${request.learningStyle} learning style with hands-on projects`,
            prerequisites: [],
            marketRelevance: 95
          },
          {
            id: 'practical-skills',
            title: 'Core Practical Skills',
            type: 'project',
            estimatedWeeks: 4,
            cost: Math.round(baseCost * 0.3),
            difficulty: 3,
            personalizedReason: `Focuses on ${request.focus} approach you prefer`,
            prerequisites: ['foundation'],
            marketRelevance: 88
          },
          {
            id: 'portfolio-project',
            title: 'Portfolio Development',
            type: 'project',
            estimatedWeeks: 3,
            cost: 0,
            difficulty: 3,
            personalizedReason: 'Showcases skills relevant to your target companies',
            prerequisites: ['practical-skills'],
            marketRelevance: 92
          }
        ],
        mayaInsights: {
          recommendation: mayaResponse?.response?.substring(0, 200) || `This fast-track path is optimized for your ${request.learningStyle} learning style and ${request.timeframe} timeline preference.`,
          strengths: [
            `Your existing ${request.currentSkills.length} skills provide a solid foundation`,
            `${request.learningStyle} learning style matches well with practical approach`,
            `${request.timeframe} timeframe allows for focused learning`
          ],
          challenges: [
            'Intensive pace may require consistent daily commitment',
            'Limited theoretical depth in favor of practical skills',
            'May need additional specialization later'
          ],
          tips: [
            `Leverage your ${request.learningStyle} learning preference with visual aids`,
            'Set weekly milestones to maintain momentum',
            'Join online communities for peer support'
          ]
        }
      },
      {
        id: 'balanced',
        title: `Balanced ${request.targetRole} Journey`,
        description: 'Comprehensive path balancing theory and practice',
        estimatedWeeks: baseWeeks,
        totalCost: baseCost,
        successProbability: 88,
        personalizationScore: 92,
        nodes: [
          {
            id: 'theory-foundation',
            title: 'Theoretical Foundation',
            type: 'course',
            estimatedWeeks: 4,
            cost: Math.round(baseCost * 0.25),
            difficulty: 2,
            personalizedReason: 'Builds solid conceptual understanding for long-term success',
            prerequisites: [],
            marketRelevance: 85
          },
          {
            id: 'practical-application',
            title: 'Practical Application',
            type: 'project',
            estimatedWeeks: 6,
            cost: Math.round(baseCost * 0.35),
            difficulty: 3,
            personalizedReason: 'Combines theory with hands-on experience',
            prerequisites: ['theory-foundation'],
            marketRelevance: 90
          },
          {
            id: 'specialization',
            title: 'Area Specialization',
            type: 'course',
            estimatedWeeks: 4,
            cost: Math.round(baseCost * 0.25),
            difficulty: 4,
            personalizedReason: 'Focuses on high-demand specialization in your target market',
            prerequisites: ['practical-application'],
            marketRelevance: 95
          },
          {
            id: 'capstone',
            title: 'Capstone Project',
            type: 'project',
            estimatedWeeks: 4,
            cost: Math.round(baseCost * 0.15),
            difficulty: 4,
            personalizedReason: 'Demonstrates mastery to potential employers',
            prerequisites: ['specialization'],
            marketRelevance: 98
          }
        ],
        mayaInsights: {
          recommendation: 'This balanced approach maximizes your success probability while building deep, marketable skills.',
          strengths: [
            'Comprehensive skill development',
            'Strong theoretical foundation',
            'Market-validated practical experience'
          ],
          challenges: [
            'Longer time commitment required',
            'Higher cost investment',
            'Need for sustained motivation'
          ],
          tips: [
            'Break learning into weekly sprints',
            'Build a learning network early',
            'Document progress for motivation'
          ]
        }
      },
      {
        id: 'comprehensive',
        title: `Expert ${request.targetRole} Mastery`,
        description: 'Deep, comprehensive path for expert-level competency',
        estimatedWeeks: Math.round(baseWeeks * 1.5),
        totalCost: Math.round(baseCost * 1.3),
        successProbability: 95,
        personalizationScore: 88,
        nodes: [
          {
            id: 'advanced-theory',
            title: 'Advanced Theoretical Framework',
            type: 'course',
            estimatedWeeks: 6,
            cost: Math.round(baseCost * 0.3),
            difficulty: 3,
            personalizedReason: 'Deep understanding for senior-level roles',
            prerequisites: [],
            marketRelevance: 82
          },
          {
            id: 'multi-project',
            title: 'Multiple Practice Projects',
            type: 'project',
            estimatedWeeks: 8,
            cost: Math.round(baseCost * 0.2),
            difficulty: 4,
            personalizedReason: 'Builds extensive portfolio demonstrating expertise',
            prerequisites: ['advanced-theory'],
            marketRelevance: 88
          },
          {
            id: 'certification',
            title: 'Professional Certification',
            type: 'certification',
            estimatedWeeks: 4,
            cost: Math.round(baseCost * 0.35),
            difficulty: 4,
            personalizedReason: 'Industry-recognized credential for credibility',
            prerequisites: ['multi-project'],
            marketRelevance: 94
          },
          {
            id: 'mentorship',
            title: 'Mentorship & Leadership',
            type: 'skill',
            estimatedWeeks: 6,
            cost: Math.round(baseCost * 0.15),
            difficulty: 3,
            personalizedReason: 'Develops leadership skills for senior positions',
            prerequisites: ['certification'],
            marketRelevance: 90
          }
        ],
        mayaInsights: {
          recommendation: 'This comprehensive path positions you for senior roles and industry leadership.',
          strengths: [
            'Expert-level competency development',
            'Strong industry credibility',
            'Leadership skill development'
          ],
          challenges: [
            'Significant time and financial investment',
            'Requires high self-discipline',
            'May be over-qualified for entry positions'
          ],
          tips: [
            'Start building industry network early',
            'Consider part-time approach if working',
            'Seek sponsorship or employer support'
          ]
        }
      }
    ];
  };

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'fast': return 'bg-red-500';
      case 'balanced': return 'bg-blue-500';
      case 'thorough': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getBudgetColor = (budget: string) => {
    switch (budget) {
      case 'free': return 'bg-green-500';
      case 'low': return 'bg-yellow-500';
      case 'medium': return 'bg-orange-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI-Powered Path Generator
          </CardTitle>
          <CardDescription>
            Create personalized learning paths tailored to your goals, preferences, and learning style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target Role</label>
              <Textarea
                placeholder="e.g., Full-Stack Developer, Data Scientist, Product Manager..."
                value={request.targetRole}
                onChange={(e) => setRequest({...request, targetRole: e.target.value})}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Additional Requirements</label>
              <Textarea
                placeholder="Specific technologies, certifications, or preferences..."
                value={request.additionalRequirements}
                onChange={(e) => setRequest({...request, additionalRequirements: e.target.value})}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={request.timeframe} onValueChange={(value: any) => setRequest({...request, timeframe: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast-Track (3-6 months)</SelectItem>
                  <SelectItem value="balanced">Balanced (6-12 months)</SelectItem>
                  <SelectItem value="thorough">Comprehensive (12+ months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Budget</label>
              <Select value={request.budget} onValueChange={(value: any) => setRequest({...request, budget: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free Resources</SelectItem>
                  <SelectItem value="low">Low ($0-500)</SelectItem>
                  <SelectItem value="medium">Medium ($500-2000)</SelectItem>
                  <SelectItem value="high">High ($2000+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Learning Focus</label>
              <Select value={request.focus} onValueChange={(value: any) => setRequest({...request, focus: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practical">Practical/Hands-on</SelectItem>
                  <SelectItem value="theoretical">Theoretical/Academic</SelectItem>
                  <SelectItem value="balanced">Balanced Approach</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Learning Style</label>
              <Select value={request.learningStyle} onValueChange={(value) => setRequest({...request, learningStyle: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="auditory">Auditory</SelectItem>
                  <SelectItem value="kinesthetic">Hands-on</SelectItem>
                  <SelectItem value="reading">Reading/Writing</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={generatePersonalizedPath} 
            disabled={isGenerating || mayaLoading}
            className="w-full"
            size="lg"
          >
            {isGenerating || mayaLoading ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating Personalized Paths...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate AI-Powered Learning Paths
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedPaths.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedPaths.map((path) => (
              <Card 
                key={path.id} 
                className={`cursor-pointer transition-all ${
                  selectedPath?.id === path.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedPath(path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={selectedPath?.id === path.id ? "default" : "secondary"}>
                      {path.id.replace('-', ' ')}
                    </Badge>
                    <div className="text-sm font-medium">
                      {path.estimatedWeeks}w
                    </div>
                  </div>
                  
                  <h3 className="font-semibold mb-2">{path.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{path.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Success Probability</span>
                      <span>{path.successProbability}%</span>
                    </div>
                    <Progress value={path.successProbability} className="h-1" />
                    
                    <div className="flex justify-between text-xs">
                      <span>Personalization</span>
                      <span>{path.personalizationScore}%</span>
                    </div>
                    <Progress value={path.personalizationScore} className="h-1" />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>${path.totalCost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span>{path.nodes.length} steps</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPath && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  {selectedPath.title} - Detailed Roadmap
                </CardTitle>
                <CardDescription>
                  Maya AI's personalized recommendations and learning path
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Maya Insights */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-800">Maya's AI Insights</h4>
                    </div>
                    
                    <p className="text-sm text-purple-700 mb-4">{selectedPath.mayaInsights.recommendation}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="font-medium text-green-700 mb-2">Your Strengths</h5>
                        <ul className="text-xs text-green-600 space-y-1">
                          {selectedPath.mayaInsights.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-orange-700 mb-2">Potential Challenges</h5>
                        <ul className="text-xs text-orange-600 space-y-1">
                          {selectedPath.mayaInsights.challenges.map((challenge, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-blue-700 mb-2">Success Tips</h5>
                        <ul className="text-xs text-blue-600 space-y-1">
                          {selectedPath.mayaInsights.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Learning Steps */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Learning Roadmap</h4>
                  {selectedPath.nodes.map((node, index) => (
                    <Card key={node.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-medium">{node.title}</h5>
                              <p className="text-sm text-muted-foreground">{node.personalizedReason}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{node.type}</Badge>
                              <span className="text-sm text-muted-foreground">{node.estimatedWeeks}w</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              <span>Level {node.difficulty}/5</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>${node.cost}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span>{node.marketRelevance}% relevant</span>
                            </div>
                          </div>
                          
                          {node.prerequisites.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Prerequisites: {node.prerequisites.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button size="lg">
                    <Target className="w-4 h-4 mr-2" />
                    Start This Learning Path
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}