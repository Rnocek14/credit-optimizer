import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Clock, X, Trophy, Calendar, Filter, ZoomIn, ZoomOut, RotateCcw, Target, BookOpen } from "lucide-react";
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
    { id: '1', name: 'HTML', slug: 'html', category: 'Frontend', description: 'HyperText Markup Language - foundation of web development', difficulty_level: 1, xp_value: 10 },
    { id: '2', name: 'CSS', slug: 'css', category: 'Frontend', description: 'Cascading Style Sheets for styling web pages', difficulty_level: 1, xp_value: 15 },
    { id: '3', name: 'JavaScript', slug: 'javascript', category: 'Frontend', description: 'Core programming language for web development', difficulty_level: 1, xp_value: 20 },
    { id: '4', name: 'React', slug: 'react', category: 'Frontend', description: 'JavaScript library for building user interfaces', difficulty_level: 2, xp_value: 30 },
    { id: '5', name: 'TypeScript', slug: 'typescript', category: 'Frontend', description: 'Typed superset of JavaScript', difficulty_level: 2, xp_value: 25 },
    { id: '6', name: 'Node.js', slug: 'nodejs', category: 'Backend', description: 'JavaScript runtime for server-side development', difficulty_level: 2, xp_value: 25 },
    { id: '7', name: 'Next.js', slug: 'nextjs', category: 'Frontend', description: 'React framework for production applications', difficulty_level: 3, xp_value: 35 },
    { id: '8', name: 'GraphQL', slug: 'graphql', category: 'Backend', description: 'Query language and runtime for APIs', difficulty_level: 3, xp_value: 35 },
    { id: '9', name: 'AWS', slug: 'aws', category: 'Cloud', description: 'Amazon Web Services cloud platform', difficulty_level: 3, xp_value: 40 },
    { id: '10', name: 'Docker', slug: 'docker', category: 'DevOps', description: 'Containerization platform', difficulty_level: 3, xp_value: 30 }
  ],
  progress: [
    { skill_id: '1', status: 'verified', cri_score: 85, verification_source: 'Web Development Course', verification_date: '2024-01-15', xp_earned: 10 },
    { skill_id: '2', status: 'verified', cri_score: 82, verification_source: 'CSS Advanced Course', verification_date: '2024-01-22', xp_earned: 15 },
    { skill_id: '3', status: 'verified', cri_score: 88, verification_source: 'JavaScript Mastery', verification_date: '2024-02-10', xp_earned: 20 },
    { skill_id: '4', status: 'verified', cri_score: 90, verification_source: 'React Fundamentals', verification_date: '2024-03-05', xp_earned: 30 },
    { skill_id: '5', status: 'in_progress', xp_earned: 12 },
    { skill_id: '6', status: 'in_progress', xp_earned: 8 },
    { skill_id: '7', status: 'locked', xp_earned: 0 },
    { skill_id: '8', status: 'locked', xp_earned: 0 },
    { skill_id: '9', status: 'locked', xp_earned: 0 },
    { skill_id: '10', status: 'locked', xp_earned: 0 }
  ],
  edges: [
    { prerequisite_skill_id: '1', skill_id: '2' },
    { prerequisite_skill_id: '1', skill_id: '3' },
    { prerequisite_skill_id: '3', skill_id: '4' },
    { prerequisite_skill_id: '3', skill_id: '5' },
    { prerequisite_skill_id: '3', skill_id: '6' },
    { prerequisite_skill_id: '4', skill_id: '7' },
    { prerequisite_skill_id: '6', skill_id: '8' },
    { prerequisite_skill_id: '8', skill_id: '9' },
    { prerequisite_skill_id: '6', skill_id: '10' }
  ]
};

export default function SkillTree() {
  const [skillTreeData, setSkillTreeData] = useState<SkillTreeData>(demoSkillTreeData);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<SkillProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [treeTranslate, setTreeTranslate] = useState({ x: 400, y: 100 });
  const [treeZoom, setTreeZoom] = useState(0.8);
  const treeRef = useRef<any>(null);

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
        return <CheckCircle2 className={`${size} text-emerald-400`} />;
      case 'in_progress':
        return <Clock className={`${size} text-amber-400`} />;
      case 'locked':
        return <Lock className={`${size} text-slate-500`} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Frontend': '🎨',
      'Backend': '⚙️',
      'Cloud': '☁️',
      'DevOps': '🔧',
      'Mobile': '📱',
      'AI/ML': '🤖',
      'Database': '🗄️',
      'Security': '🔒'
    };
    return icons[category] || '📚';
  };

  const getDomainColors = (category: string) => {
    const colors: Record<string, { primary: string, secondary: string, glow: string, bg: string }> = {
      'Frontend': { 
        primary: '#10b981', 
        secondary: '#34d399', 
        glow: '#6ee7b7',
        bg: 'rgba(16, 185, 129, 0.1)'
      },
      'Backend': { 
        primary: '#3b82f6', 
        secondary: '#60a5fa', 
        glow: '#93c5fd',
        bg: 'rgba(59, 130, 246, 0.1)'
      },
      'Cloud': { 
        primary: '#8b5cf6', 
        secondary: '#a78bfa', 
        glow: '#c4b5fd',
        bg: 'rgba(139, 92, 246, 0.1)'
      },
      'DevOps': { 
        primary: '#f59e0b', 
        secondary: '#fbbf24', 
        glow: '#fcd34d',
        bg: 'rgba(245, 158, 11, 0.1)'
      }
    };
    return colors[category] || colors['Frontend'];
  };

  const getCRIColor = (score?: number) => {
    if (!score) return '#64748b';
    if (score >= 90) return '#10b981'; // emerald-500
    if (score >= 80) return '#22c55e'; // green-500
    if (score >= 70) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
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

  const handleZoomIn = () => {
    setTreeZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setTreeZoom(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleResetView = () => {
    setTreeTranslate({ x: 400, y: 100 });
    setTreeZoom(0.8);
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

    if (rootSkillIds.length > 0) {
      return buildNode(rootSkillIds[0]);
    }

    return buildNode(data.skills[0].id);
  };

  const renderCustomNode = ({ nodeDatum }: any) => {
    const status = nodeDatum.attributes?.status || 'locked';
    const category = nodeDatum.attributes?.category || '';
    const criScore = nodeDatum.attributes?.cri_score;
    const xpValue = nodeDatum.attributes?.xp_value || 0;
    const skillId = nodeDatum.attributes?.id;
    const progress = getSkillProgress(skillId);
    const xpEarned = progress?.xp_earned || 0;
    const xpProgress = xpValue > 0 ? (xpEarned / xpValue) * 100 : 0;
    const domainColors = getDomainColors(category);
    const categoryIcon = getCategoryIcon(category);

    // Calculate radius based on status with increased spacing
    const baseRadius = 52;
    const nodeWidth = baseRadius * 2.5;

    // Status-specific styling
    const getStatusBorder = () => {
      switch (status) {
        case 'verified':
          return { stroke: '#10b981', strokeWidth: '3', strokeDasharray: 'none' };
        case 'in_progress':
          return { stroke: '#f59e0b', strokeWidth: '2', strokeDasharray: 'none' };
        case 'locked':
          return { stroke: '#64748b', strokeWidth: '2', strokeDasharray: '8,4' };
        default:
          return { stroke: '#64748b', strokeWidth: '2', strokeDasharray: 'none' };
      }
    };

    const statusBorder = getStatusBorder();

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <g 
              style={{ 
                pointerEvents: 'all', 
                cursor: 'pointer',
                filter: status === 'verified' ? 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))' : 
                       status === 'in_progress' ? 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.3))' : 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick({ data: { attributes: nodeDatum.attributes } });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNodeClick({ data: { attributes: nodeDatum.attributes } });
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${nodeDatum.name} skill - ${status} status`}
            >
              {/* Subtle glow for verified skills */}
              {status === 'verified' && (
                <circle
                  cx="0"
                  cy="0"
                  r={baseRadius + 6}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeOpacity="0.4"
                >
                  <animate
                    attributeName="stroke-opacity"
                    values="0.4;0.2;0.4"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Animated ring for in-progress skills */}
              {status === 'in_progress' && (
                <circle
                  cx="0"
                  cy="0"
                  r={baseRadius + 4}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeOpacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values={`${baseRadius + 4};${baseRadius + 8};${baseRadius + 4}`}
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.6;0.2;0.6"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Main node background - Always dark for readability */}
              <rect
                x={-nodeWidth/2}
                y={-baseRadius}
                width={nodeWidth}
                height={baseRadius * 2}
                rx="12"
                fill="#0f172a"
                stroke={statusBorder.stroke}
                strokeWidth={statusBorder.strokeWidth}
                strokeDasharray={statusBorder.strokeDasharray}
                opacity={status === 'locked' ? '0.6' : '1'}
              >
                {/* Hover effect */}
                <animate
                  attributeName="fill"
                  values="#0f172a;#1e293b;#0f172a"
                  dur="0.3s"
                  begin="mouseover"
                />
              </rect>

              {/* XP Progress bar background */}
              <rect
                x={-nodeWidth/2 + 8}
                y={-baseRadius + 8}
                width={nodeWidth - 16}
                height="4"
                rx="2"
                fill="#374151"
              />

              {/* XP Progress bar fill */}
              <rect
                x={-nodeWidth/2 + 8}
                y={-baseRadius + 8}
                width={Math.max(2, ((nodeWidth - 16) * xpProgress) / 100)}
                height="4"
                rx="2"
                fill="#60a5fa"
              />

              {/* Category icon - top left */}
              <circle
                cx={-nodeWidth/2 + 18}
                cy={-baseRadius + 24}
                r="12"
                fill={domainColors.primary}
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text
                x={-nodeWidth/2 + 18}
                y={-baseRadius + 24}
                fontSize="14"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
              >
                {categoryIcon}
              </text>

              {/* CRI badge - top right */}
              {criScore && (
                <>
                  <rect
                    x={nodeWidth/2 - 32}
                    y={-baseRadius + 8}
                    width="28"
                    height="16"
                    rx="8"
                    fill={getCRIColor(criScore)}
                    stroke="#0f172a"
                    strokeWidth="1"
                  />
                  <text
                    x={nodeWidth/2 - 18}
                    y={-baseRadius + 16}
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                  >
                    {criScore}
                  </text>
                </>
              )}

              {/* Status indicator */}
              <circle
                cx={nodeWidth/2 - 18}
                cy={-baseRadius + 30}
                r="6"
                fill={status === 'verified' ? '#10b981' : 
                      status === 'in_progress' ? '#f59e0b' : '#64748b'}
                stroke="#0f172a"
                strokeWidth="1"
              />

              {/* Skill name background for better readability */}
              <rect
                x={-nodeWidth/2 + 4}
                y={-18}
                width={nodeWidth - 8}
                height="20"
                rx="4"
                fill="rgba(15, 23, 42, 0.8)"
              />

              {/* Skill name - center with white text */}
              <text
                x="0"
                y="-8"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
              >
                {nodeDatum.name.length > 11 ? 
                  `${nodeDatum.name.slice(0, 11)}...` : 
                  nodeDatum.name
                }
              </text>

              {/* Category label */}
              <text
                x="0"
                y="8"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94a3b8"
              >
                {category}
              </text>

              {/* XP earned text background for better readability */}
              <rect
                x={-25}
                y={baseRadius - 18}
                width="50"
                height="14"
                rx="3"
                fill="rgba(15, 23, 42, 0.8)"
              />

              {/* XP earned text - bottom with guaranteed white text */}
              <text
                x="0"
                y={baseRadius - 10}
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e2e8f0"
              >
                {xpEarned}/{xpValue} XP
              </text>

              {/* Click ripple effect */}
              <circle
                cx="0"
                cy="0"
                r="0"
                fill="none"
                stroke={domainColors.primary}
                strokeWidth="3"
                opacity="0"
              >
                <animate
                  attributeName="r"
                  values="0;60;0"
                  dur="0.6s"
                  begin="click"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.8;0"
                  dur="0.6s"
                  begin="click"
                />
              </circle>
            </g>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-xs bg-slate-800 border-slate-700 text-slate-100" 
            side="right"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{categoryIcon}</span>
                <span className="font-semibold">{nodeDatum.name}</span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span>{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status, 'h-3 w-3')}
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                  </div>
                </div>
                {criScore && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">CRI Score:</span>
                    <span className="font-medium" style={{ color: getCRIColor(criScore) }}>
                      {criScore}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Progress:</span>
                  <span>{Math.round(xpProgress)}% ({xpEarned}/{xpValue} XP)</span>
                </div>
                {progress?.verification_source && (
                  <div>
                    <span className="text-slate-400 text-xs">Source:</span>
                    <div className="text-xs font-medium">{progress.verification_source}</div>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-96 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const treeData = buildTreeStructure(filteredData);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-2">
            🌳 Skill Tree Navigator
          </h1>
          <p className="text-slate-400 text-lg">
            Explore your skill progression and unlock new learning pathways through your interactive skill tree
          </p>
        </div>

        {/* Filter Bar */}
        <Card className="bg-slate-800 border-slate-700 rounded-xl shadow-lg mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Filter className="h-5 w-5 text-emerald-400" />
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
              >
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Button>
              <Button
                variant={activeFilters.includes('in_progress') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('in_progress')}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 border-amber-500"
              >
                <Clock className="h-3 w-3" />
                In Progress
              </Button>
              <Button
                variant={activeFilters.includes('locked') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('locked')}
                className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 border-slate-500"
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
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {getCategoryIcon(category)} {category}
                </Button>
              ))}
              
              {/* Clear Filters */}
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilters([])}
                  className="ml-2 text-slate-400 hover:text-slate-100"
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interactive Skill Tree */}
        <Card className="bg-slate-800 border-slate-700 rounded-xl shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Trophy className="h-5 w-5 text-emerald-400" />
                  Interactive Skill Tree
                </CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Click nodes to explore skills. Use mouse wheel to zoom and drag to pan.
                </p>
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ZoomOut className="h-3 w-3" />
                  Zoom Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  className="flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ZoomIn className="h-3 w-3" />
                  Zoom In
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetView}
                  className="flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[700px] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative">
              <Tree
                data={treeData}
                orientation="vertical"
                translate={treeTranslate}
                zoom={treeZoom}
                enableLegacyTransitions={true}
                onNodeClick={handleNodeClick}
                renderCustomNodeElement={renderCustomNode}
                separation={{ siblings: 2.5, nonSiblings: 3 }}
                nodeSize={{ x: 180, y: 140 }}
                ref={treeRef}
              />
              <style>
                {`
                  .rd3t-tree-container .rd3t-link {
                    stroke: #475569 !important;
                    stroke-width: 3px !important;
                    fill: none !important;
                    filter: drop-shadow(0 0 4px rgba(71, 85, 105, 0.3));
                  }
                  .rd3t-tree-container {
                    width: 100% !important;
                    height: 100% !important;
                    background: #0f172a;
                  }
                `}
              </style>
            </div>
          </CardContent>
        </Card>

        {/* Skill Detail Panel - Mobile responsive */}
        <Sheet open={isDetailPanelOpen} onOpenChange={setIsDetailPanelOpen}>
          <SheetContent 
            className="w-full sm:w-96 sm:max-w-96 bg-slate-800 border-slate-700 text-slate-100" 
            side="right"
          >
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2 text-slate-100">
                  {selectedProgress && getStatusIcon(selectedProgress.status)}
                  {selectedSkill?.name}
                </SheetTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsDetailPanelOpen(false)}
                  className="text-slate-400 hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {selectedSkill && (
              <div className="mt-6 space-y-6">
                {/* Skill Info */}
                <div>
                  <h3 className="font-semibold mb-3 text-slate-100">Skill Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Category</span>
                      <Badge 
                        variant="secondary" 
                        className="bg-slate-700 text-slate-200 border-slate-600"
                      >
                        {getCategoryIcon(selectedSkill.category)} {selectedSkill.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Difficulty</span>
                      <Badge className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
                        Level {selectedSkill.difficulty_level}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">XP Value</span>
                      <span className="text-sm font-medium text-slate-200">{selectedSkill.xp_value} XP</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mt-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
                    {selectedSkill.description}
                  </p>
                </div>

                {/* Progress Info */}
                {selectedProgress && (
                  <div>
                    <h3 className="font-semibold mb-3 text-slate-100">Your Progress</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Status</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedProgress.status)}
                          <span className="text-sm font-medium capitalize text-slate-200">
                            {selectedProgress.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {selectedProgress.cri_score && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">CRI Score</span>
                          <Badge 
                            variant="outline" 
                            className="border-emerald-500 text-emerald-400 bg-emerald-950"
                          >
                            {selectedProgress.cri_score}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">XP Progress</span>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-slate-200">
                            {selectedProgress.xp_earned} / {selectedSkill.xp_value} XP
                          </span>
                          <div className="w-20 h-2 bg-slate-700 rounded-full mt-1">
                            <div 
                              className="h-2 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all" 
                              style={{ 
                                width: `${Math.min(100, (selectedProgress.xp_earned / selectedSkill.xp_value) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {selectedProgress.verification_source && (
                        <div>
                          <span className="text-sm text-slate-400">Verification Source</span>
                          <p className="text-sm font-medium mt-1 text-slate-200">{selectedProgress.verification_source}</p>
                        </div>
                      )}

                      {selectedProgress.verification_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar className="h-4 w-4" />
                          Completed on {new Date(selectedProgress.verification_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Roadmap Relevance */}
                <div>
                  <h3 className="font-semibold mb-3 text-slate-100">Roadmap Alignment</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-blue-900/30 to-emerald-900/30 border border-blue-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Career Goal Alignment</span>
                      </div>
                      <p className="text-xs text-blue-200">
                        This skill is essential for your {selectedSkill?.category} career track and opens pathways to senior-level positions.
                      </p>
                    </div>
                    
                    {selectedProgress?.status === 'verified' && (
                      <div className="p-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-800/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-300">Milestone Achieved</span>
                        </div>
                        <p className="text-xs text-emerald-200">
                          Excellent work! Consider exploring advanced topics or related skills in your learning path.
                        </p>
                      </div>
                    )}
                    
                    {selectedProgress?.status === 'in_progress' && (
                      <div className="p-4 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-800/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-300">Active Learning</span>
                        </div>
                        <p className="text-xs text-amber-200">
                          Keep going! Complete related courses to earn the remaining {selectedSkill.xp_value - (selectedProgress?.xp_earned || 0)} XP.
                        </p>
                      </div>
                    )}
                    
                    {selectedProgress?.status === 'locked' && (
                      <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-300">Prerequisites Required</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Complete prerequisite skills to unlock this learning path and start earning XP.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}