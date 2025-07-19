import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Clock, X, Trophy, Calendar } from "lucide-react";
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

  const getStatusIcon = (status: 'locked' | 'in_progress' | 'verified') => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'locked':
        return <Lock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: 'locked' | 'in_progress' | 'verified') => {
    switch (status) {
      case 'verified':
        return 'border-green-500 bg-green-50';
      case 'in_progress':
        return 'border-yellow-500 bg-yellow-50';
      case 'locked':
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const buildTreeStructure = (): SkillNode => {
    const skillMap = new Map<string, Skill>();
    const progressMap = new Map<string, SkillProgress>();
    
    skillTreeData.skills.forEach(skill => skillMap.set(skill.id, skill));
    skillTreeData.progress.forEach(progress => progressMap.set(progress.skill_id, progress));

    // Find root nodes (skills with no prerequisites)
    const rootSkillIds = skillTreeData.skills
      .filter(skill => !skillTreeData.edges.some(edge => edge.skill_id === skill.id))
      .map(skill => skill.id);

    const buildNode = (skillId: string): SkillNode => {
      const skill = skillMap.get(skillId)!;
      const progress = progressMap.get(skillId);
      
      const children = skillTreeData.edges
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
    return buildNode(skillTreeData.skills[0].id);
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

    return (
      <g>
        <circle
          r="25"
          className={`cursor-pointer transition-all hover:r-30 ${getStatusColor(status)}`}
          stroke={status === 'verified' ? '#10b981' : status === 'in_progress' ? '#f59e0b' : '#6b7280'}
          strokeWidth="2"
          fill={status === 'verified' ? '#dcfce7' : status === 'in_progress' ? '#fef3c7' : '#f9fafb'}
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium"
          fill="#374151"
          y="0"
        >
          {nodeDatum.name}
        </text>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs"
          fill="#6b7280"
          y="35"
        >
          {category}
        </text>
        {criScore && (
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-bold"
            fill="#059669"
            y="-35"
          >
            CRI {criScore}
          </text>
        )}
      </g>
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

  const treeData = buildTreeStructure();

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">🌳 Skill Tree Navigator</h1>
        <p className="text-muted-foreground">
          Explore your skill progression and unlock new learning pathways through your interactive skill tree
        </p>
      </div>

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
          <div className="h-96 border border-gray-200 rounded-lg overflow-hidden">
            <Tree
              data={treeData}
              orientation="vertical"
              translate={{ x: 200, y: 50 }}
              zoom={0.8}
              enableLegacyTransitions={true}
              onNodeClick={handleNodeClick}
              renderCustomNodeElement={renderCustomNode}
              separation={{ siblings: 1.5, nonSiblings: 2 }}
              nodeSize={{ x: 120, y: 80 }}
            />
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