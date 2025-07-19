import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Clock, X, Trophy, Calendar, Filter } from "lucide-react";
import Tree from "react-d3-tree";

interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  difficulty_level: number;
  xp_value: number;
}

interface SkillProgress {
  skill_id: string;
  status: 'locked' | 'in_progress' | 'verified';
  cri_score?: number;
  verification_source?: string;
  verification_date?: string;
  xp_earned: number;
}

interface SkillNode {
  name: string;
  attributes?: {
    id: string;
    status: 'locked' | 'in_progress' | 'verified';
    category: string;
    difficulty_level: number;
    xp_value: number;
    cri_score?: number;
    verification_source?: string;
    description?: string;
  };
  children?: SkillNode[];
}

interface SkillTreeData {
  skills: Skill[];
  progress: SkillProgress[];
  edges: { prerequisite_skill_id: string; skill_id: string }[];
}

// Demo data for Aisha Khan
const demoSkillTreeData: SkillTreeData = {
  skills: [
    { id: '1', name: 'HTML', slug: 'html', category: 'Markup', description: 'HyperText Markup Language - foundation of web development', difficulty_level: 1, xp_value: 10 },
    { id: '2', name: 'CSS', slug: 'css', category: 'Styling', description: 'Cascading Style Sheets for styling web pages', difficulty_level: 1, xp_value: 15 },
    { id: '3', name: 'JavaScript', slug: 'javascript', category: 'Programming', description: 'Core programming language for web development', difficulty_level: 1, xp_value: 20 },
    { id: '4', name: 'React', slug: 'react', category: 'Framework', description: 'JavaScript library for building user interfaces', difficulty_level: 2, xp_value: 30 },
    { id: '5', name: 'TypeScript', slug: 'typescript', category: 'Programming', description: 'Typed superset of JavaScript', difficulty_level: 2, xp_value: 25 },
    { id: '6', name: 'Node.js', slug: 'nodejs', category: 'Backend', description: 'JavaScript runtime for server-side development', difficulty_level: 2, xp_value: 25 },
    { id: '7', name: 'Next.js', slug: 'nextjs', category: 'Framework', description: 'React framework for production applications', difficulty_level: 3, xp_value: 35 },
    { id: '8', name: 'GraphQL', slug: 'graphql', category: 'API', description: 'Query language and runtime for APIs', difficulty_level: 3, xp_value: 35 }
  ],
  progress: [
    { skill_id: '1', status: 'verified', cri_score: 85, verification_source: 'Web Development Course', verification_date: '2024-01-15', xp_earned: 10 },
    { skill_id: '2', status: 'verified', cri_score: 82, verification_source: 'CSS Advanced Course', verification_date: '2024-01-22', xp_earned: 15 },
    { skill_id: '3', status: 'verified', cri_score: 88, verification_source: 'JavaScript Mastery', verification_date: '2024-02-10', xp_earned: 20 },
    { skill_id: '4', status: 'verified', cri_score: 90, verification_source: 'React Fundamentals', verification_date: '2024-03-05', xp_earned: 30 },
    { skill_id: '5', status: 'in_progress', xp_earned: 12 },
    { skill_id: '6', status: 'in_progress', xp_earned: 8 },
    { skill_id: '7', status: 'locked', xp_earned: 0 },
    { skill_id: '8', status: 'locked', xp_earned: 0 }
  ],
  edges: [
    { prerequisite_skill_id: '1', skill_id: '2' },
    { prerequisite_skill_id: '1', skill_id: '3' },
    { prerequisite_skill_id: '3', skill_id: '4' },
    { prerequisite_skill_id: '3', skill_id: '5' },
    { prerequisite_skill_id: '3', skill_id: '6' },
    { prerequisite_skill_id: '4', skill_id: '7' },
    { prerequisite_skill_id: '6', skill_id: '8' }
  ]
};

export default function SkillTree() {
  const [skillTreeData, setSkillTreeData] = useState<SkillTreeData>(demoSkillTreeData);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<SkillProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    fetchSkillTreeData();
  }, []);

  const fetchSkillTreeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSkillTreeData(demoSkillTreeData);
        setLoading(false);
        return;
      }

      // Fetch real data from the new tables
      const [skillsResponse, progressResponse, edgesResponse] = await Promise.all([
        supabase.from('skills').select('*'),
        supabase.from('user_skill_progress').select('*').eq('user_id', user.id),
        supabase.from('skill_graph_edges').select('*')
      ]);

      if (skillsResponse.data && skillsResponse.data.length > 0) {
        const realData: SkillTreeData = {
          skills: skillsResponse.data,
          progress: (progressResponse.data || []).map(p => ({
            skill_id: p.skill_id,
            status: p.status as 'locked' | 'in_progress' | 'verified',
            cri_score: p.cri_score,
            verification_source: p.verification_source,
            verification_date: p.verification_date,
            xp_earned: p.xp_earned
          })),
          edges: edgesResponse.data || []
        };
        setSkillTreeData(realData);
      } else {
        // Fallback to demo data
        setSkillTreeData(demoSkillTreeData);
      }
    } catch (error) {
      console.error('Error fetching skill tree data:', error);
      setSkillTreeData(demoSkillTreeData);
    } finally {
      setLoading(false);
    }
  };

  const getSkillProgress = (skillId: string): SkillProgress | undefined => {
    return skillTreeData.progress.find(p => p.skill_id === skillId);
  };

  const getStatusIcon = (status: 'locked' | 'in_progress' | 'verified', size = 'h-4 w-4') => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className={`${size} text-green-600`} />;
      case 'in_progress':
        return <Clock className={`${size} text-yellow-600`} />;
      case 'locked':
        return <Lock className={`${size} text-gray-400`} />;
    }
  };

  const getStatusBg = (status: 'locked' | 'in_progress' | 'verified') => {
    switch (status) {
      case 'verified':
        return '#dcfce7'; // green-100
      case 'in_progress':
        return '#fef3c7'; // yellow-100
      case 'locked':
        return '#f3f4f6'; // gray-100
    }
  };

  const getStatusBorder = (status: 'locked' | 'in_progress' | 'verified') => {
    switch (status) {
      case 'verified':
        return '#22c55e'; // green-500
      case 'in_progress':
        return '#eab308'; // yellow-500
      case 'locked':
        return '#9ca3af'; // gray-400
    }
  };

  const getCRIColor = (score?: number) => {
    if (!score) return '#9ca3af';
    if (score >= 90) return '#059669'; // emerald-600
    if (score >= 80) return '#16a34a'; // green-600
    if (score >= 70) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-green-100 text-green-800 border-green-200';
      case 2:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFilteredData = () => {
    if (activeFilters.length === 0) return skillTreeData;

    const filteredSkills = skillTreeData.skills.filter(skill => {
      const progress = getSkillProgress(skill.id);
      const status = progress?.status || 'locked';

      return activeFilters.some(filter => {
        if (filter === 'verified' && status === 'verified') return true;
        if (filter === 'in_progress' && status === 'in_progress') return true;
        if (filter === 'locked' && status === 'locked') return true;
        if (filter.toLowerCase() === skill.category.toLowerCase()) return true;
        return false;
      });
    });

    const filteredSkillIds = new Set(filteredSkills.map(s => s.id));
    const filteredEdges = skillTreeData.edges.filter(edge =>
      filteredSkillIds.has(edge.prerequisite_skill_id) && filteredSkillIds.has(edge.skill_id)
    );

    return {
      ...skillTreeData,
      skills: filteredSkills,
      edges: filteredEdges
    };
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getUniqueCategories = () => {
    return [...new Set(skillTreeData.skills.map(s => s.category))];
  };

  const buildTreeStructure = (data = skillTreeData): SkillNode => {
    const skillMap = new Map<string, Skill>();
    const progressMap = new Map<string, SkillProgress>();
    
    data.skills.forEach(skill => skillMap.set(skill.id, skill));
    data.progress.forEach(progress => progressMap.set(progress.skill_id, progress));

    // Find root nodes (skills with no prerequisites)
    const rootSkillIds = data.skills
      .filter(skill => !data.edges.some(edge => edge.skill_id === skill.id))
      .map(skill => skill.id);

    const buildNode = (skillId: string): SkillNode => {
      const skill = skillMap.get(skillId)!;
      const progress = progressMap.get(skillId);
      
      const children = data.edges
        .filter(edge => edge.prerequisite_skill_id === skillId)
        .map(edge => buildNode(edge.skill_id));

      return {
        name: skill.name,
        attributes: {
          id: skill.id,
          status: progress?.status || 'locked',
          category: skill.category,
          difficulty_level: skill.difficulty_level,
          xp_value: skill.xp_value,
          cri_score: progress?.cri_score,
          verification_source: progress?.verification_source,
          description: skill.description
        },
        children: children.length > 0 ? children : undefined
      };
    };

    // If we have root nodes, use the first one as the tree root
    if (rootSkillIds.length > 0) {
      return buildNode(rootSkillIds[0]);
    }

    // Fallback: use the first skill
    return buildNode(data.skills[0].id);
  };

  const handleNodeClick = (nodeData: any) => {
    const skillId = nodeData.data.attributes?.id;
    if (skillId) {
      const skill = skillTreeData.skills.find(s => s.id === skillId);
      const progress = getSkillProgress(skillId);
      
      if (skill) {
        setSelectedSkill(skill);
        setSelectedProgress(progress || null);
        setIsDetailPanelOpen(true);
      }
    }
  };

  const renderCustomNode = ({ nodeDatum }: any) => {
    const status = nodeDatum.attributes?.status || 'locked';
    const category = nodeDatum.attributes?.category || '';
    const difficultyLevel = nodeDatum.attributes?.difficulty_level || 1;
    const criScore = nodeDatum.attributes?.cri_score;
    const xpValue = nodeDatum.attributes?.xp_value || 0;
    const skillId = nodeDatum.attributes?.id;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <g>
              {/* Card Background */}
              <rect
                x="-60"
                y="-30"
                width="120"
                height="60"
                rx="8"
                fill={getStatusBg(status)}
                stroke={getStatusBorder(status)}
                strokeWidth="2"
                className="cursor-pointer transition-all hover:stroke-width-3"
                onMouseEnter={() => setHoveredNode(skillId)}
                onMouseLeave={() => setHoveredNode(null)}
              />
              
              {/* Status Icon - Top Left */}
              <foreignObject x="-55" y="-25" width="16" height="16">
                <div className="flex items-center justify-center w-4 h-4">
                  {getStatusIcon(status, 'h-3 w-3')}
                </div>
              </foreignObject>

              {/* CRI Badge - Top Right */}
              {criScore && (
                <rect
                  x="30"
                  y="-25"
                  width="24"
                  height="16"
                  rx="8"
                  fill={getCRIColor(criScore)}
                />
              )}
              {criScore && (
                <text
                  x="42"
                  y="-17"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold"
                  fill="white"
                >
                  {criScore}
                </text>
              )}

              {/* Skill Name */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-bold"
                fill="#1f2937"
                y="-5"
              >
                {nodeDatum.name.length > 12 ? nodeDatum.name.substring(0, 12) + '...' : nodeDatum.name}
              </text>

              {/* Category Badge */}
              <rect
                x="-30"
                y="5"
                width="60"
                height="16"
                rx="8"
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs"
                fill="#374151"
                y="13"
              >
                {category}
              </text>

              {/* XP Progress Bar */}
              <rect
                x="-50"
                y="22"
                width="100"
                height="4"
                rx="2"
                fill="#e5e7eb"
              />
              <rect
                x="-50"
                y="22"
                width="100"
                height="4"
                rx="2"
                fill={status === 'verified' ? '#22c55e' : status === 'in_progress' ? '#eab308' : '#9ca3af'}
              />
            </g>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-semibold">{nodeDatum.name}</p>
              <p>Category: {category}</p>
              <p>Status: {status.replace('_', ' ')}</p>
              {criScore && <p>CRI Score: {criScore}</p>}
              <p>XP Value: {xpValue}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const treeData = buildTreeStructure(filteredData);

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">🌳 Skill Tree Navigator</h1>
        <p className="text-muted-foreground">
          Explore your skill progression and unlock new learning pathways through your interactive skill tree
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-xl shadow-sm border mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {/* Status Filters */}
            <Button
              variant={activeFilters.includes('verified') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('verified')}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-3 w-3" />
              Verified Only
            </Button>
            <Button
              variant={activeFilters.includes('in_progress') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('in_progress')}
              className="flex items-center gap-2"
            >
              <Clock className="h-3 w-3" />
              In Progress
            </Button>
            <Button
              variant={activeFilters.includes('locked') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter('locked')}
              className="flex items-center gap-2"
            >
              <Lock className="h-3 w-3" />
              Locked
            </Button>
            
            {/* Category Filters */}
            {getUniqueCategories().map(category => (
              <Button
                key={category}
                variant={activeFilters.includes(category.toLowerCase()) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter(category.toLowerCase())}
              >
                {category}
              </Button>
            ))}
            
            {/* Clear Filters */}
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilters([])}
                className="ml-2"
              >
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="rounded-xl shadow-sm border mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Legend */}
            <div>
              <h4 className="font-medium mb-3">Skill Status</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100"></div>
                  <span className="text-sm">Verified - Skill mastered with proof</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-100"></div>
                  <span className="text-sm">In Progress - Currently learning</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-gray-400 bg-gray-100"></div>
                  <span className="text-sm">Locked - Prerequisites not met</span>
                </div>
              </div>
            </div>
            
            {/* CRI Legend */}
            <div>
              <h4 className="font-medium mb-3">CRI Score Levels</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#059669' }}></div>
                  <span className="text-sm">90+ Expert Level</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#16a34a' }}></div>
                  <span className="text-sm">80-89 Proficient</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#ca8a04' }}></div>
                  <span className="text-sm">70-79 Developing</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                  <span className="text-sm">Below 70 Needs Improvement</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Skill Tree */}
      <Card className="rounded-xl shadow-sm border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Interactive Skill Tree
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on any skill node to view details. Use mouse wheel to zoom and drag to pan.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden relative">
            <Tree
              data={treeData}
              orientation="vertical"
              translate={{ x: 300, y: 80 }}
              zoom={0.7}
              enableLegacyTransitions={true}
              onNodeClick={handleNodeClick}
              renderCustomNodeElement={renderCustomNode}
              separation={{ siblings: 2, nonSiblings: 2.5 }}
              nodeSize={{ x: 160, y: 120 }}
            />
            <style>
              {`
                .rd3t-tree-container .rd3t-link {
                  stroke: #9ca3af !important;
                  stroke-width: 2px !important;
                  fill: none !important;
                }
              `}
            </style>
          </div>
        </CardContent>
      </Card>

      {/* Skill Detail Panel */}
      <Sheet open={isDetailPanelOpen} onOpenChange={setIsDetailPanelOpen}>
        <SheetContent className="w-96">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                {selectedProgress && getStatusIcon(selectedProgress.status)}
                {selectedSkill?.name}
              </SheetTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailPanelOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {selectedSkill && (
            <div className="mt-6 space-y-6">
              {/* Skill Info */}
              <div>
                <h3 className="font-semibold mb-3">Skill Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="secondary">{selectedSkill.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <Badge className={getDifficultyColor(selectedSkill.difficulty_level)}>
                      Level {selectedSkill.difficulty_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">XP Value</span>
                    <span className="text-sm font-medium">{selectedSkill.xp_value} XP</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {selectedSkill.description}
                </p>
              </div>

              {/* Progress Info */}
              {selectedProgress && (
                <div>
                  <h3 className="font-semibold mb-3">Your Progress</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedProgress.status)}
                        <span className="text-sm font-medium capitalize">
                          {selectedProgress.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {selectedProgress.cri_score && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CRI Score</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {selectedProgress.cri_score}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">XP Earned</span>
                      <span className="text-sm font-medium">
                        {selectedProgress.xp_earned} / {selectedSkill.xp_value} XP
                      </span>
                    </div>

                    {selectedProgress.verification_source && (
                      <div>
                        <span className="text-sm text-muted-foreground">Verified through</span>
                        <p className="text-sm font-medium mt-1">{selectedProgress.verification_source}</p>
                      </div>
                    )}

                    {selectedProgress.verification_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Completed on {new Date(selectedProgress.verification_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}