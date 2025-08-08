import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface JobRequirement {
  skill: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  importance: 'High' | 'Medium' | 'Low';
}

interface DemoCandidate {
  id: string;
  name: string;
  title: string;
  skills: string[];
  overallFit: number;
  availability: string;
}

const jobRequirements: JobRequirement[] = [
  { skill: 'React', level: 'Advanced', importance: 'High' },
  { skill: 'TypeScript', level: 'Intermediate', importance: 'High' },
  { skill: 'Node.js', level: 'Intermediate', importance: 'Medium' },
  { skill: 'AWS', level: 'Beginner', importance: 'Medium' },
  { skill: 'GraphQL', level: 'Beginner', importance: 'Low' },
];

const demoCandidates: DemoCandidate[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    title: 'Frontend Developer',
    skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML'],
    overallFit: 92,
    availability: 'Immediate'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    title: 'Full Stack Developer',
    skills: ['React', 'Node.js', 'MongoDB', 'Express', 'AWS'],
    overallFit: 85,
    availability: '2 weeks'
  },
  {
    id: '3',
    name: 'Emily Zhang',
    title: 'Software Engineer',
    skills: ['React', 'TypeScript', 'Python', 'PostgreSQL', 'Docker'],
    overallFit: 78,
    availability: '1 month'
  },
  {
    id: '4',
    name: 'Alex Johnson',
    title: 'Backend Developer',
    skills: ['Node.js', 'GraphQL', 'MongoDB', 'AWS', 'Kubernetes'],
    overallFit: 72,
    availability: 'Immediate'
  },
];

const Employer: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const getSkillMatch = (candidate: DemoCandidate): number => {
    const requiredSkills = jobRequirements.map(req => req.skill.toLowerCase());
    const candidateSkills = candidate.skills.map(skill => skill.toLowerCase());
    const matches = requiredSkills.filter(skill => candidateSkills.includes(skill));
    return Math.round((matches.length / requiredSkills.length) * 100);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Employer Hub | Talent Matching Dashboard</title>
        <meta name="description" content="Find and match talent with your job requirements using AI-powered insights" />
        <link rel="canonical" href="/employer" />
      </Helmet>

      {!isAuthenticated && (
        <div data-testid="demo-guard-banner" className="bg-blue-100 border-b border-blue-200 p-4">
          <div className="container mx-auto">
            <p className="text-blue-800 text-center">
              <strong>Demo Mode:</strong> You're viewing the Employer Hub in demo mode. 
              <a href="/auth" className="underline ml-2">Sign in</a> for full access.
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Employer Hub</h1>
          <p className="text-muted-foreground">
            Find the perfect candidates with AI-powered talent matching
          </p>
        </div>

        {/* Job Requirements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Job Requirements</CardTitle>
            <CardDescription>Senior Frontend Developer Position</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {jobRequirements.map((req, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{req.skill}</div>
                    <div className="text-sm text-muted-foreground">{req.level}</div>
                  </div>
                  <Badge variant={req.importance === 'High' ? 'default' : req.importance === 'Medium' ? 'secondary' : 'outline'}>
                    {req.importance}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoCandidates.length}</div>
              <p className="text-xs text-muted-foreground">Matched profiles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Fit Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(demoCandidates.reduce((sum, c) => sum + c.overallFit, 0) / demoCandidates.length)}%
              </div>
              <p className="text-xs text-muted-foreground">Overall match</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Immediate Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {demoCandidates.filter(c => c.availability === 'Immediate').length}
              </div>
              <p className="text-xs text-muted-foreground">Ready to start</p>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Matching Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate Matching</CardTitle>
            <CardDescription>Top candidates ranked by skill fit and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoCandidates
                .sort((a, b) => b.overallFit - a.overallFit)
                .map((candidate) => {
                  const skillMatch = getSkillMatch(candidate);
                  return (
                    <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h4 className="font-medium">{candidate.name}</h4>
                            <p className="text-sm text-muted-foreground">{candidate.title}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills.map((skill) => (
                            <Badge 
                              key={skill} 
                              variant={jobRequirements.some(req => req.skill.toLowerCase() === skill.toLowerCase()) ? "default" : "outline"}
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-sm font-medium">Overall Fit</div>
                          <div className="text-lg font-bold">{candidate.overallFit}%</div>
                          <Progress value={candidate.overallFit} className="w-20 mt-1" />
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-medium">Skill Match</div>
                          <div className="text-lg font-bold">{skillMatch}%</div>
                          <Progress value={skillMatch} className="w-20 mt-1" />
                        </div>
                        
                        <div className="text-center">
                          <div className="text-sm font-medium">Availability</div>
                          <Badge variant={candidate.availability === 'Immediate' ? 'default' : 'secondary'}>
                            {candidate.availability}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Employer;