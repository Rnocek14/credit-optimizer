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

// Layer configuration for visual progression
const LAYER_CONFIG = [
  { name: "🪴 Foundations", description: "Core building blocks" },
  { name: "📈 Builder Layer", description: "Intermediate skills" },
  { name: "🌐 Systems & Scale", description: "Advanced concepts" },
  { name: "🚀 Expert Mastery", description: "Specialized expertise" },
  { name: "🔬 Innovation", description: "Cutting-edge skills" }
];

const LAYER_SPACING = 160; // Vertical spacing between layers
const NODE_SPACING = 120; // Horizontal spacing within layers

// Layer unlock configuration
const LAYER_UNLOCK_CONFIG = {
  minVerifiedSkills: 2, // Minimum verified skills needed in previous layer
  minXpPercentage: 50,  // Minimum XP percentage needed in previous layer
  demoMode: false       // When true, all layers are unlocked
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
  const [isDemoMode, setIsDemoMode] = useState(true); // Demo mode for unlocking all layers
  const treeRef = useRef<any>(null);

  // Find the suggested next skill for progression
  const getSuggestedNextSkill = (data = skillTreeData) => {
    // Don't show suggestions in demo mode
    if (isDemoMode) {
      return null;
    }
    
    const unlockedLayers = getUnlockedLayers(data);
    const layerMap = getSkillLayers(data);
    const maxLayer = Math.max(...Array.from(layerMap.keys()));
    
    // Find the lowest locked layer
    let nextLockedLayer = -1;
    for (let i = 0; i <= maxLayer; i++) {
      if (!unlockedLayers.has(i)) {
        nextLockedLayer = i;
        break;
      }
    }
    
    // If all layers are unlocked, no suggestion needed
    if (nextLockedLayer === -1) {
      return null;
    }
    
    // Get skills from the previous layer (the one that needs progress)
    const previousLayer = nextLockedLayer - 1;
    if (previousLayer < 0) return null;
    
    const previousLayerSkills = layerMap.get(previousLayer) || [];
    if (previousLayerSkills.length === 0) return null;
    
    // Find skills that are candidates for progression
    const candidates = previousLayerSkills
      .map(skill => {
        const progress = getSkillProgress(skill.id);
        const xpEarned = progress?.xp_earned || 0;
        const xpNeeded = skill.xp_value;
        const status = progress?.status || 'locked';
        
        // Score based on progress and priority
        let score = 0;
        if (status === 'in_progress') {
          score = 100 + (xpEarned / xpNeeded) * 50; // High priority for in-progress
        } else if (status === 'locked' && xpEarned > 0) {
          score = 50 + (xpEarned / xpNeeded) * 40; // Medium priority for started but not in-progress
        } else if (status === 'locked') {
          score = 10; // Low priority for not started
        } else if (status === 'verified') {
          score = 0; // Already verified, not a candidate
        }
        
        return {
          skill,
          progress,
          xpEarned,
          xpNeeded,
          status,
          score,
          completionRatio: xpNeeded > 0 ? xpEarned / xpNeeded : 0
        };
      })
      .filter(candidate => candidate.score > 0) // Only unverified skills
      .sort((a, b) => b.score - a.score); // Sort by priority score
    
    if (candidates.length === 0) return null;
    
    const topCandidate = candidates[0];
    const layerStats = getLayerStats(previousLayer, data);
    
    return {
      skill: topCandidate.skill,
      progress: topCandidate.progress,
      xpEarned: topCandidate.xpEarned,
      xpNeeded: topCandidate.xpNeeded,
      status: topCandidate.status,
      nextLockedLayer,
      previousLayer,
      layerStats,
      reason: `Verifying this unlocks ${LAYER_CONFIG[nextLockedLayer]?.name || `Layer ${nextLockedLayer + 1}`}`
    };
  };

  // Scroll to and highlight a specific skill node
  const jumpToSkill = (skillId: string) => {
    // Find the skill node in the DOM and scroll to it
    const skillElements = document.querySelectorAll('[aria-label*="Skill:"]');
    let targetElement: Element | null = null;
    
    skillElements.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label') || '';
      if (ariaLabel.includes(skillTreeData.skills.find(s => s.id === skillId)?.name || '')) {
        targetElement = element;
      }
    });
    
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Add a brief highlight animation
      const svgElement = targetElement as SVGElement;
      const highlightCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      highlightCircle.setAttribute('cx', '0');
      highlightCircle.setAttribute('cy', '0');
      highlightCircle.setAttribute('r', '80');
      highlightCircle.setAttribute('fill', 'none');
      highlightCircle.setAttribute('stroke', '#3b82f6');
      highlightCircle.setAttribute('stroke-width', '4');
      highlightCircle.setAttribute('opacity', '0');
      
      // Create pulsing animation
      const animation = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animation.setAttribute('attributeName', 'opacity');
      animation.setAttribute('values', '0;0.8;0;0.6;0');
      animation.setAttribute('dur', '2s');
      animation.setAttribute('repeatCount', '2');
      
      const scaleAnimation = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      scaleAnimation.setAttribute('attributeName', 'transform');
      scaleAnimation.setAttribute('type', 'scale');
      scaleAnimation.setAttribute('values', '0.8;1.2;0.8;1.1;0.8');
      scaleAnimation.setAttribute('dur', '2s');
      scaleAnimation.setAttribute('repeatCount', '2');
      
      highlightCircle.appendChild(animation);
      highlightCircle.appendChild(scaleAnimation);
      svgElement.appendChild(highlightCircle);
      
      // Remove the highlight after animation
      setTimeout(() => {
        if (highlightCircle.parentNode) {
          highlightCircle.parentNode.removeChild(highlightCircle);
        }
      }, 4000);
    }
  };

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
      // Check if the skill's layer is unlocked
      if (!isSkillLayerUnlocked(skillId)) {
        const depthMap = calculateSkillDepths();
        const skillDepth = depthMap.get(skillId) || 0;
        const unlockText = getLayerUnlockText(skillDepth);
        // You could show a toast here instead of opening the panel
        return; // Don't open detail panel for locked skills
      }
      
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

  // Calculate skill depth based on prerequisite chain
  const calculateSkillDepths = (data = skillTreeData): Map<string, number> => {
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();
    
    const calculateDepth = (skillId: string): number => {
      if (depthMap.has(skillId)) {
        return depthMap.get(skillId)!;
      }
      
      if (visited.has(skillId)) {
        // Circular dependency, assign default depth
        depthMap.set(skillId, 0);
        return 0;
      }
      
      visited.add(skillId);
      
      // Find prerequisites for this skill
      const prerequisites = data.edges
        .filter(edge => edge.skill_id === skillId)
        .map(edge => edge.prerequisite_skill_id);
      
      if (prerequisites.length === 0) {
        // No prerequisites, this is a foundation skill
        depthMap.set(skillId, 0);
        visited.delete(skillId);
        return 0;
      }
      
      // Calculate depth as max prerequisite depth + 1
      const maxPrereqDepth = Math.max(
        ...prerequisites.map(prereqId => calculateDepth(prereqId))
      );
      
      const depth = maxPrereqDepth + 1;
      depthMap.set(skillId, depth);
      visited.delete(skillId);
      return depth;
    };
    
    // Calculate depth for all skills
    data.skills.forEach(skill => {
      calculateDepth(skill.id);
    });
    
    return depthMap;
  };

  // Group skills by layer based on their depth
  const getSkillLayers = (data = skillTreeData): Map<number, Skill[]> => {
    const depthMap = calculateSkillDepths(data);
    const layerMap = new Map<number, Skill[]>();
    
    data.skills.forEach(skill => {
      const depth = depthMap.get(skill.id) || 0;
      if (!layerMap.has(depth)) {
        layerMap.set(depth, []);
      }
      layerMap.get(depth)!.push(skill);
    });
    
    return layerMap;
  };

  // Determine which layers are unlocked based on user progress
  const getUnlockedLayers = (data = skillTreeData): Set<number> => {
    const unlockedLayers = new Set<number>();
    const layerMap = getSkillLayers(data);
    const maxLayer = Math.max(...Array.from(layerMap.keys()));
    
    // Demo mode or root layer is always unlocked
    if (isDemoMode || LAYER_UNLOCK_CONFIG.demoMode) {
      for (let i = 0; i <= maxLayer; i++) {
        unlockedLayers.add(i);
      }
      return unlockedLayers;
    }
    
    // Layer 0 (foundations) is always unlocked
    unlockedLayers.add(0);
    
    // Check each subsequent layer
    for (let layerIndex = 1; layerIndex <= maxLayer; layerIndex++) {
      const previousLayerSkills = layerMap.get(layerIndex - 1) || [];
      
      if (previousLayerSkills.length === 0) {
        // No previous layer, unlock this one
        unlockedLayers.add(layerIndex);
        continue;
      }
      
      // Count verified skills in previous layer
      const verifiedSkills = previousLayerSkills.filter(skill => {
        const progress = getSkillProgress(skill.id);
        return progress?.status === 'verified';
      }).length;
      
      // Calculate total XP earned vs total XP available in previous layer
      const totalXpAvailable = previousLayerSkills.reduce((sum, skill) => sum + skill.xp_value, 0);
      const totalXpEarned = previousLayerSkills.reduce((sum, skill) => {
        const progress = getSkillProgress(skill.id);
        return sum + (progress?.xp_earned || 0);
      }, 0);
      const xpPercentage = totalXpAvailable > 0 ? (totalXpEarned / totalXpAvailable) * 100 : 0;
      
      // Check unlock conditions
      const hasEnoughVerifiedSkills = verifiedSkills >= LAYER_UNLOCK_CONFIG.minVerifiedSkills;
      const hasEnoughXp = xpPercentage >= LAYER_UNLOCK_CONFIG.minXpPercentage;
      
      if (hasEnoughVerifiedSkills || hasEnoughXp) {
        unlockedLayers.add(layerIndex);
      } else {
        // If this layer is locked, all subsequent layers are also locked
        break;
      }
    }
    
    return unlockedLayers;
  };

  // Get unlock requirement text for a locked layer
  const getLayerUnlockText = (layerIndex: number, data = skillTreeData): string => {
    if (layerIndex === 0) return ""; // Root layer is always unlocked
    
    const layerMap = getSkillLayers(data);
    const previousLayerSkills = layerMap.get(layerIndex - 1) || [];
    
    if (previousLayerSkills.length === 0) return "";
    
    const verifiedCount = previousLayerSkills.filter(skill => {
      const progress = getSkillProgress(skill.id);
      return progress?.status === 'verified';
    }).length;
    
    const totalXpAvailable = previousLayerSkills.reduce((sum, skill) => sum + skill.xp_value, 0);
    const totalXpEarned = previousLayerSkills.reduce((sum, skill) => {
      const progress = getSkillProgress(skill.id);
      return sum + (progress?.xp_earned || 0);
    }, 0);
    const xpPercentage = totalXpAvailable > 0 ? (totalXpEarned / totalXpAvailable) * 100 : 0;
    
    const skillsNeeded = Math.max(0, LAYER_UNLOCK_CONFIG.minVerifiedSkills - verifiedCount);
    const xpNeeded = Math.max(0, LAYER_UNLOCK_CONFIG.minXpPercentage - xpPercentage);
    
    if (skillsNeeded === 0) {
      return `Unlocked! (${verifiedCount}/${LAYER_UNLOCK_CONFIG.minVerifiedSkills} verified skills)`;
    }
    
    if (xpNeeded <= 0) {
      return `Unlocked! (${Math.round(xpPercentage)}%/${LAYER_UNLOCK_CONFIG.minXpPercentage}% XP earned)`;
    }
    
    const previousLayerName = LAYER_CONFIG[layerIndex - 1]?.name || `Layer ${layerIndex}`;
    return `Complete ${skillsNeeded} more skill${skillsNeeded !== 1 ? 's' : ''} in ${previousLayerName} to unlock`;
  };

  // Check if a specific skill's layer is unlocked
  const isSkillLayerUnlocked = (skillId: string, data = skillTreeData): boolean => {
    const depthMap = calculateSkillDepths(data);
    const skillDepth = depthMap.get(skillId) || 0;
    const unlockedLayers = getUnlockedLayers(data);
    return unlockedLayers.has(skillDepth);
  };

  // Calculate layer statistics for progress overlay
  const getLayerStats = (layerIndex: number, data = skillTreeData) => {
    const layerMap = getSkillLayers(data);
    const skillsInLayer = layerMap.get(layerIndex) || [];
    
    if (skillsInLayer.length === 0) {
      return {
        totalXp: 0,
        earnedXp: 0,
        completionPercentage: 0,
        averageCri: 0,
        verifiedCount: 0,
        totalCount: 0,
        hasData: false
      };
    }
    
    let totalXp = 0;
    let earnedXp = 0;
    let totalCri = 0;
    let verifiedCount = 0;
    
    skillsInLayer.forEach(skill => {
      const progress = getSkillProgress(skill.id);
      totalXp += skill.xp_value;
      earnedXp += progress?.xp_earned || 0;
      
      if (progress?.status === 'verified' && progress.cri_score) {
        totalCri += progress.cri_score;
        verifiedCount++;
      }
    });
    
    const completionPercentage = totalXp > 0 ? (earnedXp / totalXp) * 100 : 0;
    const averageCri = verifiedCount > 0 ? totalCri / verifiedCount : 0;
    
    return {
      totalXp,
      earnedXp,
      completionPercentage,
      averageCri,
      verifiedCount,
      totalCount: skillsInLayer.length,
      hasData: true
  };

  };

  // Build layered tree structure for custom positioning
  const buildLayeredTreeStructure = (data = skillTreeData): SkillNode => {
    const skillMap = new Map<string, Skill>();
    const progressMap = new Map<string, SkillProgress>();
    const layerMap = getSkillLayers(data);
    
    data.skills.forEach(skill => skillMap.set(skill.id, skill));
    data.progress.forEach(progress => progressMap.set(progress.skill_id, progress));

    // Create a synthetic root node to hold all foundation skills
    const foundationSkills = layerMap.get(0) || [];
    
    const createNode = (skill: Skill): SkillNode => {
      const progress = progressMap.get(skill.id);
      
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
        children: undefined // We'll handle connections differently
      };
    };

    // Build tree with proper layered connections
    const buildConnectedNode = (skillId: string, visitedPath: Set<string> = new Set()): SkillNode => {
      if (visitedPath.has(skillId)) {
        // Prevent infinite recursion
        const skill = skillMap.get(skillId)!;
        return createNode(skill);
      }
      
      const skill = skillMap.get(skillId)!;
      const progress = progressMap.get(skillId);
      
      visitedPath.add(skillId);
      
      const children = data.edges
        .filter(edge => edge.prerequisite_skill_id === skillId)
        .map(edge => buildConnectedNode(edge.skill_id, new Set(visitedPath)));
      
      visitedPath.delete(skillId);

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

    // Start with the first foundation skill if available
    if (foundationSkills.length > 0) {
      return buildConnectedNode(foundationSkills[0].id);
    }
    
    // Fallback to first skill
    if (data.skills.length > 0) {
      return buildConnectedNode(data.skills[0].id);
    }

    // Return empty root
    return {
      name: "Root",
      children: []
    };
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

    // Check if this skill's layer is unlocked (using filtered data to respect active filters)
    const isLayerUnlocked = isSkillLayerUnlocked(skillId, skillTreeData);
    const depthMap = calculateSkillDepths(skillTreeData);
    const skillDepth = depthMap.get(skillId) || 0;
    const layerUnlockText = isLayerUnlocked ? '' : getLayerUnlockText(skillDepth, skillTreeData);

    // Calculate dimensions with better spacing
    const baseRadius = 55;
    const nodeWidth = baseRadius * 2.8;
    const nodeHeight = baseRadius * 2;

    // Status-specific styling with layer lock consideration
    const getStatusBorder = () => {
      if (!isLayerUnlocked) {
        return { stroke: '#374151', strokeWidth: '2', glow: 'none' };
      }
      
      switch (status) {
        case 'verified':
          return { stroke: '#10b981', strokeWidth: '3', glow: 'rgba(16, 185, 129, 0.4)' };
        case 'in_progress':
          return { stroke: '#f59e0b', strokeWidth: '2', glow: 'rgba(245, 158, 11, 0.4)' };
        case 'locked':
          return { stroke: '#64748b', strokeWidth: '2', glow: 'none' };
        default:
          return { stroke: '#64748b', strokeWidth: '2', glow: 'none' };
      }
    };

    const statusBorder = getStatusBorder();

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <g 
              style={{ 
                pointerEvents: isLayerUnlocked ? 'all' : 'none', 
                cursor: isLayerUnlocked ? 'pointer' : 'not-allowed',
                filter: statusBorder.glow !== 'none' ? `drop-shadow(0 4px 12px ${statusBorder.glow})` : 'none',
                transformOrigin: 'center',
                opacity: isLayerUnlocked ? 1 : 0.4
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isLayerUnlocked) {
                  handleNodeClick({ data: { attributes: nodeDatum.attributes } });
                } else {
                  // Optional: Show toast notification for locked skills
                  console.log(`Skill "${nodeDatum.name}" is locked. ${layerUnlockText}`);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && isLayerUnlocked) {
                  e.preventDefault();
                  handleNodeClick({ data: { attributes: nodeDatum.attributes } });
                }
              }}
              tabIndex={isLayerUnlocked ? 0 : -1}
              role="button"
              aria-label={
                isLayerUnlocked 
                  ? `Skill: ${nodeDatum.name}, Status: ${status}, XP: ${xpEarned}/${xpValue}`
                  : `Locked skill: ${nodeDatum.name}. ${layerUnlockText}`
              }
            >
              {/* Hover scale animation */}
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.03;1"
                dur="0.3s"
                begin="mouseover"
              />

              {/* Subtle glow for verified skills */}
              {status === 'verified' && (
                <rect
                  x={-nodeWidth/2 - 4}
                  y={-nodeHeight/2 - 4}
                  width={nodeWidth + 8}
                  height={nodeHeight + 8}
                  rx="16"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                >
                  <animate
                    attributeName="stroke-opacity"
                    values="0.3;0.1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}

              {/* Animated ring for in-progress skills */}
              {status === 'in_progress' && (
                <rect
                  x={-nodeWidth/2 - 3}
                  y={-nodeHeight/2 - 3}
                  width={nodeWidth + 6}
                  height={nodeHeight + 6}
                  rx="15"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeOpacity="0.5"
                >
                  <animate
                    attributeName="stroke-width"
                    values="2;4;2"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.5;0.2;0.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}

              {/* Main node background - solid dark with inner shadow */}
              <defs>
                <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                  <feOffset dx="0" dy="2" result="offset"/>
                  <feFlood floodColor="#000000" floodOpacity="0.4"/>
                  <feComposite in2="offset" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <rect
                x={-nodeWidth/2}
                y={-nodeHeight/2}
                width={nodeWidth}
                height={nodeHeight}
                rx="12"
                 fill={isLayerUnlocked ? "#1e293b" : "#0f172a"}
                stroke={statusBorder.stroke}
                strokeWidth={statusBorder.strokeWidth}
                opacity={!isLayerUnlocked ? 0.4 : (status === 'locked' ? 0.7 : 1)}
                filter="url(#innerShadow)"
              >
                {/* Hover effect - only for unlocked layers */}
                {isLayerUnlocked && (
                  <animate
                    attributeName="fill"
                    values="#1e293b;#334155;#1e293b"
                    dur="0.3s"
                    begin="mouseover"
                  />
                )}
              </rect>

              {/* Layer lock overlay */}
              {!isLayerUnlocked && (
                <>
                  <rect
                    x={-nodeWidth/2}
                    y={-nodeHeight/2}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="12"
                    fill="rgba(0, 0, 0, 0.7)"
                    stroke="#374151"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;8"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  
                  {/* Lock icon */}
                  <circle
                    cx="0"
                    cy="-5"
                    r="12"
                    fill="#374151"
                    stroke="#64748b"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-1"
                    fontSize="14"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#9ca3af"
                    style={{ fill: '#9ca3af', color: '#9ca3af' }}
                  >
                    🔒
                  </text>
                </>
              )}

              {/* XP Progress bar background */}
              <rect
                x={-nodeWidth/2 + 12}
                y={-nodeHeight/2 + 12}
                width={nodeWidth - 24}
                height="4"
                rx="2"
                fill="#374151"
              />

              {/* XP Progress bar fill */}
              <rect
                x={-nodeWidth/2 + 12}
                y={-nodeHeight/2 + 12}
                width={Math.max(2, ((nodeWidth - 24) * xpProgress) / 100)}
                height="4"
                rx="2"
                fill="#60a5fa"
              />

              {/* Category icon - top left with proper spacing */}
              <circle
                cx={-nodeWidth/2 + 20}
                cy={-nodeHeight/2 + 28}
                r="10"
                fill={domainColors.primary}
                stroke="#1e293b"
                strokeWidth="2"
              />
              <text
                x={-nodeWidth/2 + 20}
                y={-nodeHeight/2 + 28}
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                style={{ fill: 'white', color: 'white' }}
              >
                {categoryIcon}
              </text>

              {/* CRI badge - top right with proper styling */}
              {criScore && (
                <>
                  <rect
                    x={nodeWidth/2 - 30}
                    y={-nodeHeight/2 + 12}
                    width="24"
                    height="16"
                    rx="8"
                    fill={getCRIColor(criScore)}
                    fillOpacity="0.9"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={nodeWidth/2 - 18}
                    y={-nodeHeight/2 + 20}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    style={{ fill: 'white', color: 'white' }}
                  >
                    {criScore}
                  </text>
                </>
              )}

              {/* Status indicator */}
              <circle
                cx={nodeWidth/2 - 15}
                cy={-nodeHeight/2 + 35}
                r="5"
                fill={status === 'verified' ? '#10b981' : 
                      status === 'in_progress' ? '#f59e0b' : '#64748b'}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Skill name - center with white text */}
              <text
                x="0"
                y="-5"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                style={{ fill: 'white', color: 'white' }}
              >
                {nodeDatum.name.length > 10 ? 
                  `${nodeDatum.name.slice(0, 10)}...` : 
                  nodeDatum.name
                }
              </text>

              {/* Category label - white text */}
              <text
                x="0"
                y="8"
                fontSize="10"
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                letterSpacing="0.5"
                style={{ fill: 'white', color: 'white' }}
              >
                {category.toUpperCase()}
              </text>

              {/* XP earned text - bottom with white text */}
              <text
                x="0"
                y={nodeHeight/2 - 12}
                fontSize="10"
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                style={{ fill: 'white', color: 'white' }}
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
                  values="0;80;0"
                  dur="0.6s"
                  begin="click"
                />
                <animate
                  attributeName="opacity"
                  values="0;0.6;0"
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
                {!isLayerUnlocked && <span className="text-lg">🔒</span>}
              </div>
              
              {!isLayerUnlocked ? (
                <div className="text-sm space-y-1">
                  <div className="text-amber-400 font-medium">Layer Locked</div>
                  <div className="text-slate-300">{layerUnlockText}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    This skill is in Layer {skillDepth + 1} ({LAYER_CONFIG[skillDepth]?.name || `Layer ${skillDepth + 1}`})
                  </div>
                </div>
              ) : (
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
                  <div className="flex justify-between">
                    <span className="text-slate-400">Layer:</span>
                    <span>{LAYER_CONFIG[skillDepth]?.name || `Layer ${skillDepth + 1}`}</span>
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
              )}
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
  const treeData = buildLayeredTreeStructure(filteredData);

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
                className={`flex items-center gap-2 min-h-[40px] ${
                  activeFilters.includes('verified') 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Button>
              <Button
                variant={activeFilters.includes('in_progress') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('in_progress')}
                className={`flex items-center gap-2 min-h-[40px] ${
                  activeFilters.includes('in_progress') 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                }`}
              >
                <Clock className="h-3 w-3" />
                In Progress
              </Button>
              <Button
                variant={activeFilters.includes('locked') ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleFilter('locked')}
                className={`flex items-center gap-2 min-h-[40px] ${
                  activeFilters.includes('locked') 
                    ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-500' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                }`}
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
                  className={`min-h-[40px] ${
                    activeFilters.includes(category.toLowerCase()) 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 font-bold' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                  }`}
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
                  className="ml-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 min-h-[40px]"
                >
                  Clear All
                </Button>
              )}
              
              {/* Demo Mode Toggle */}
              <div className="ml-4 pl-4 border-l border-slate-600">
                <Button
                  variant={isDemoMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsDemoMode(!isDemoMode)}
                  className={`flex items-center gap-2 min-h-[40px] ${
                    isDemoMode 
                      ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                  }`}
                >
                  <BookOpen className="h-3 w-3" />
                  {isDemoMode ? 'Demo Mode (All Unlocked)' : 'Realistic Mode'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggested Next Skill Card */}
        {(() => {
          const suggestion = getSuggestedNextSkill(filteredData);
          if (!suggestion) return null;
          
          return (
            <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30 rounded-xl shadow-lg animate-fade-in mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Suggested Next Skill</h3>
                    </div>
                    
                    {/* Skill Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(suggestion.skill.category)}</span>
                        <div>
                          <h4 className="text-xl font-bold text-blue-300">{suggestion.skill.name}</h4>
                          <p className="text-sm text-slate-400">{suggestion.skill.category}</p>
                        </div>
                      </div>
                      
                      {/* Reason */}
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-amber-400" />
                        <span className="text-amber-300 font-medium">{suggestion.reason}</span>
                      </div>
                      
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">XP Progress</span>
                          <span className="text-white font-medium">
                            {suggestion.xpEarned}/{suggestion.xpNeeded} XP
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700 ease-out"
                            style={{ 
                              width: `${Math.min(100, (suggestion.xpEarned / suggestion.xpNeeded) * 100)}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-slate-400">
                          {Math.round((suggestion.xpEarned / suggestion.xpNeeded) * 100)}% complete
                        </div>
                      </div>
                      
                      {/* Layer Stats */}
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-700">
                        <span>Layer {suggestion.previousLayer + 1}: {suggestion.layerStats.verifiedCount}/{suggestion.layerStats.totalCount} verified</span>
                        <span>•</span>
                        <span>{Math.round(suggestion.layerStats.completionPercentage)}% complete</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex flex-col gap-2 sm:min-w-fit">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => jumpToSkill(suggestion.skill.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                            size="sm"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Jump to Skill
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="bg-slate-800 border-slate-700 text-slate-100 max-w-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold">{suggestion.skill.name}</div>
                            <div className="text-sm text-slate-300">
                              {suggestion.skill.description}
                            </div>
                            <div className="text-xs text-slate-400 pt-1 border-t border-slate-700">
                              Click to scroll to this skill in the tree
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Status Badge */}
                    <div className={`text-xs px-2 py-1 rounded-full text-center font-medium ${
                      suggestion.status === 'in_progress' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                    }`}>
                      {suggestion.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

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
                   className="flex items-center gap-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600 min-h-[40px]"
                 >
                   <ZoomOut className="h-3 w-3" />
                   Zoom Out
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleZoomIn}
                   className="flex items-center gap-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600 min-h-[40px]"
                 >
                   <ZoomIn className="h-3 w-3" />
                   Zoom In
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleResetView}
                   className="flex items-center gap-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600 min-h-[40px]"
                 >
                   <RotateCcw className="h-3 w-3" />
                   Reset
                 </Button>
               </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[700px] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative">
              {/* Layer Labels - positioned absolutely on left side */}
              {getSkillLayers(filteredData).size > 0 && (
                <div className="absolute left-4 top-0 z-10 flex flex-col gap-4 pt-6">
                  {Array.from(getSkillLayers(filteredData).keys()).sort((a, b) => a - b).map((layerIndex) => {
                    const layerConfig = LAYER_CONFIG[layerIndex] || { 
                      name: `📚 Layer ${layerIndex + 1}`, 
                      description: `Advanced skills level ${layerIndex + 1}` 
                    };
                    const skillsInLayer = getSkillLayers(filteredData).get(layerIndex) || [];
                    const unlockedLayers = getUnlockedLayers(filteredData);
                    const isLayerUnlocked = unlockedLayers.has(layerIndex);
                    const layerUnlockText = getLayerUnlockText(layerIndex, filteredData);
                    const layerStats = getLayerStats(layerIndex, filteredData);
                    
                    return (
                      <div 
                        key={layerIndex}
                        className="relative"
                        style={{ 
                          marginTop: layerIndex === 0 ? '20px' : `${LAYER_SPACING - 40}px`
                        }}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`backdrop-blur-sm border rounded-lg shadow-lg max-w-[220px] ${
                                isLayerUnlocked 
                                  ? 'bg-slate-800/90 border-slate-600/50' 
                                  : 'bg-slate-900/50 border-slate-700/30'
                              }`}>
                                {/* Layer Header */}
                                <div className="p-3 pb-2">
                                  <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${
                                    isLayerUnlocked ? 'text-slate-100' : 'text-slate-400'
                                  }`}>
                                    {layerConfig.name}
                                    {!isLayerUnlocked && <span className="text-xs">🔒</span>}
                                  </div>
                                  <div className={`text-xs ${
                                    isLayerUnlocked ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {skillsInLayer.length} skill{skillsInLayer.length !== 1 ? 's' : ''}
                                    {!isLayerUnlocked && ' • Locked'}
                                  </div>
                                </div>

                                {/* XP + CRI Summary Overlay */}
                                {layerStats.hasData && (
                                  <div className={`px-3 pb-3 space-y-2 ${
                                    !isLayerUnlocked ? 'opacity-50' : ''
                                  }`}>
                                    {/* XP Progress Bar */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className={isLayerUnlocked ? 'text-slate-300' : 'text-slate-500'}>
                                          XP Progress
                                        </span>
                                        <span className={`font-medium ${
                                          isLayerUnlocked ? 'text-slate-200' : 'text-slate-500'
                                        }`}>
                                          {layerStats.earnedXp}/{layerStats.totalXp}
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-500 ease-out ${
                                            isLayerUnlocked 
                                              ? layerStats.completionPercentage >= 100 
                                                ? 'bg-emerald-500' 
                                                : 'bg-blue-500'
                                              : 'bg-slate-600'
                                          }`}
                                          style={{ 
                                            width: `${Math.min(100, layerStats.completionPercentage)}%`,
                                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                          }}
                                        />
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        {Math.round(layerStats.completionPercentage)}% complete
                                      </div>
                                    </div>

                                    {/* CRI Average Badge */}
                                    {layerStats.verifiedCount > 0 && (
                                      <div className="flex items-center justify-between">
                                        <span className={`text-xs ${
                                          isLayerUnlocked ? 'text-slate-300' : 'text-slate-500'
                                        }`}>
                                          Avg CRI
                                        </span>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          isLayerUnlocked 
                                            ? layerStats.averageCri >= 90 
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                              : layerStats.averageCri >= 80 
                                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                : layerStats.averageCri >= 70 
                                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                            : 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
                                        }`}>
                                          {Math.round(layerStats.averageCri)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Skills Status */}
                                    <div className="flex items-center justify-between text-xs">
                                      <span className={isLayerUnlocked ? 'text-slate-300' : 'text-slate-500'}>
                                        Verified
                                      </span>
                                      <span className={`font-medium ${
                                        isLayerUnlocked 
                                          ? layerStats.verifiedCount === layerStats.totalCount 
                                            ? 'text-emerald-300' 
                                            : 'text-slate-200'
                                          : 'text-slate-500'
                                      }`}>
                                        {layerStats.verifiedCount}/{layerStats.totalCount}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Layer divider line */}
                                <div className={`absolute -right-4 top-1/2 transform -translate-y-1/2 w-4 h-px bg-gradient-to-r ${
                                  isLayerUnlocked 
                                    ? 'from-slate-600 to-transparent' 
                                    : 'from-slate-700 to-transparent'
                                }`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              className="bg-slate-800 border-slate-700 text-slate-100 max-w-xs"
                            >
                              <div className="space-y-3">
                                <div className="font-semibold flex items-center gap-2">
                                  {layerConfig.name}
                                  {!isLayerUnlocked && <span>🔒</span>}
                                </div>
                                <div className="text-sm text-slate-300">{layerConfig.description}</div>
                                
                                {/* Detailed Stats in Tooltip */}
                                {layerStats.hasData && (
                                  <div className="space-y-2 text-sm border-t border-slate-700 pt-2">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">XP Progress:</span>
                                      <span>{layerStats.earnedXp}/{layerStats.totalXp} ({Math.round(layerStats.completionPercentage)}%)</span>
                                    </div>
                                    {layerStats.verifiedCount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Average CRI:</span>
                                        <span style={{ color: getCRIColor(layerStats.averageCri) }}>
                                          {Math.round(layerStats.averageCri)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Skills Verified:</span>
                                      <span>{layerStats.verifiedCount}/{layerStats.totalCount}</span>
                                    </div>
                                  </div>
                                )}

                                {!isLayerUnlocked ? (
                                  <div className="text-sm border-t border-slate-700 pt-2">
                                    <div className="text-amber-400 font-medium">Locked</div>
                                    <div className="text-xs text-slate-400 mt-1">{layerUnlockText}</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                                    Skills: {skillsInLayer.map(s => s.name).join(', ')}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Horizontal divider lines between layers */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {Array.from(getSkillLayers(filteredData).keys()).slice(1).map((layerIndex) => (
                  <div
                    key={`divider-${layerIndex}`}
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent"
                    style={{
                      top: `${50 + layerIndex * (LAYER_SPACING * treeZoom)}px`,
                      transform: `translateY(${treeTranslate.y}px)`
                    }}
                  />
                ))}
              </div>

              <Tree
                data={treeData}
                orientation="vertical"
                translate={treeTranslate}
                zoom={treeZoom}
                enableLegacyTransitions={true}
                onNodeClick={handleNodeClick}
                renderCustomNodeElement={renderCustomNode}
                separation={{ siblings: 2.5, nonSiblings: 3 }}
                nodeSize={{ x: NODE_SPACING, y: LAYER_SPACING }}
                ref={treeRef}
                pathFunc="step"
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
                  .rd3t-tree-container svg text {
                    fill: white !important;
                    font-family: sans-serif !important;
                  }
                  .rd3t-tree-container text {
                    fill: white !important;
                    color: white !important;
                    font-family: sans-serif !important;
                  }
                  /* Force all SVG text elements to be white */
                  svg text, svg text * {
                    fill: white !important;
                    color: white !important;
                  }
                  /* Ensure no inherited dark colors override white text */
                  .rd3t-tree-container * {
                    color: inherit;
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
