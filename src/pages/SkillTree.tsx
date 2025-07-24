import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SkillTreeFilters } from '@/components/SkillTreeFilters';
import { SimpleSkillTree } from '@/components/SimpleSkillTree';
import { SkillDetailSidePanel } from '@/components/SkillDetailSidePanel';
import { SkillTreePerformanceTest } from '@/components/SkillTreePerformanceTest';
import { ExportTreeButton } from '@/components/ExportTreeButton';
import { CareerGoalDropdown } from '@/components/CareerGoalDropdown';
import { CareerROIPanel } from '@/components/CareerROIPanel';
import { LocationDropdown } from '@/components/LocationDropdown';
import { LocationROIExplorer } from '@/components/LocationROIExplorer';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Target, Award, TestTube, Globe, Focus, Route } from 'lucide-react';
import { getCurrentUser } from '@/lib/authHelper';
import { useCareerSteps } from '@/hooks/useCareerSteps';

interface Skill {
  id: string;
  name: string;
  category: string;
  xp_value: number;
  difficulty_level: number;
  description?: string;
  slug: string;
}

interface UserProgress {
  skill_id: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  xp_earned: number;
  cri_score?: number;
  verification_source?: string;
}

interface SkillEdge {
  prerequisite_skill_id: string;
  skill_id: string;
}

const SkillTree = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const skillTreeRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [showRecommendedNext, setShowRecommendedNext] = useState(false);
  const [showGoalPathOnly, setShowGoalPathOnly] = useState(false);
  const [showPerformanceTest, setShowPerformanceTest] = useState(false);
  const [selectedCareerPath, setSelectedCareerPath] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('united-states');
  const [showRelocationExplorer, setShowRelocationExplorer] = useState(false);
  const [showPivotPaths, setShowPivotPaths] = useState(false);

  // Fetch skills with better error handling
  const { data: skills = [], isLoading: skillsLoading, error: skillsError } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      console.log('Fetching skills...');
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Skills fetch error:', error);
        throw error;
      }
      console.log('Skills fetched:', data?.length || 0);
      return data as Skill[];
    }
  });

  // Fetch categories with error handling
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['skill-categories'],
    queryFn: async () => {
      console.log('Fetching categories...');
      const { data, error } = await supabase
        .from('skills')
        .select('category')
        .not('category', 'is', null);
      
      if (error) {
        console.error('Categories fetch error:', error);
        throw error;
      }
      
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      console.log('Categories fetched:', uniqueCategories);
      return uniqueCategories;
    }
  });

  // Initialize activeCategories with all categories once they're loaded
  useEffect(() => {
    if (categories.length > 0 && activeCategories.length === 0) {
      setActiveCategories(categories);
    }
  }, [categories, activeCategories.length]);

  // Fetch user progress with better error handling
  const { data: userProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['user-skill-progress'],
    queryFn: async () => {
      console.log('Fetching user progress...');
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user found, creating mock progress');
        // Create mock progress for demo purposes
        return skills.slice(0, 5).map((skill, index) => ({
          skill_id: skill.id,
          status: index < 2 ? 'completed' : index < 4 ? 'in_progress' : 'available',
          xp_earned: index < 2 ? skill.xp_value : index < 4 ? Math.floor(skill.xp_value * 0.5) : 0,
        })) as UserProgress[];
      }

      const { data, error } = await supabase
        .from('user_skill_progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Progress fetch error:', error);
        throw error;
      }
      console.log('User progress fetched:', data?.length || 0);
      return data as UserProgress[];
    },
    enabled: !!skills.length
  });

  // Fetch skill edges with error handling
  const { data: skillEdges = [], isLoading: edgesLoading } = useQuery({
    queryKey: ['skill-edges'],
    queryFn: async () => {
      console.log('Fetching skill edges...');
      const { data, error } = await supabase
        .from('skill_graph_edges')
        .select('*');
      
      if (error) {
        console.error('Skill edges fetch error:', error);
        throw error;
      }
      console.log('Skill edges fetched:', data?.length || 0);
      return data as SkillEdge[];
    }
  });

  // Fetch skills with courses
  const { data: skillsWithCourses = [], isLoading: skillsWithCoursesLoading } = useQuery({
    queryKey: ['skills-with-courses'],
    queryFn: async () => {
      console.log('Fetching skills with courses...');
      const { data, error } = await supabase
        .from('course_skill_map')
        .select('skill_id');
      
      if (error) {
        console.error('Skills with courses fetch error:', error);
        throw error;
      }
      console.log('Skills with courses fetched:', data?.length || 0);
      return data?.map(item => item.skill_id) || [];
    }
  });

  // Mock recommended skills for now
  const recommendedSkills = skills.slice(0, 3).map(skill => skill.id);

  // Fetch Data Analyst career path ID
  const { data: dataAnalystPath } = useQuery({
    queryKey: ['data-analyst-career-path'],
    queryFn: async () => {
      console.log('Fetching Data Analyst career path...');
      const { data, error } = await supabase
        .from('career_paths')
        .select('id')
        .eq('title', 'Data Analyst')
        .single();
      
      if (error) {
        console.error('Data Analyst career path fetch error:', error);
        return null;
      }
      console.log('Data Analyst career path ID:', data?.id);
      return data;
    }
  });


  // Fetch career steps with hierarchical levels for selected career path
  const { data: selectedCareerSteps = [] } = useCareerSteps(selectedCareerPath);

  // Fetch roadmap step skills with proper SQL joins
  const { data: roadmapStepSkills = [] } = useQuery({
    queryKey: ['roadmap-step-skills', selectedCareerPath],
    queryFn: async () => {
      if (!selectedCareerPath) return [];
      
      console.log('Fetching roadmap step skills for career path:', selectedCareerPath);
      
      try {
        const { data, error } = await supabase
          .from('roadmap_step_skills')
          .select(`
            skill_id,
            roadmap_step_id,
            roadmap_steps (
              title,
              order_index,
              is_checkpoint,
              is_capstone,
              career_path_id
            )
          `)
          .eq('roadmap_steps.career_path_id', selectedCareerPath)
          .order('roadmap_steps.order_index');
        
        if (error) {
          console.error('Roadmap step skills fetch error:', error);
          return [];
        }
        
        console.log('Roadmap step skills fetched:', data?.length || 0);
        return data || [];
      } catch (err) {
        console.error('Unexpected error fetching roadmap step skills:', err);
        return [];
      }
    },
    enabled: !!selectedCareerPath,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fixed career path data query with proper error handling
  const { data: selectedCareerPathData } = useQuery({
    queryKey: ['career-path-data', selectedCareerPath],
    queryFn: async () => {
      if (!selectedCareerPath) return null;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(selectedCareerPath)) {
        // Return mock UX Designer data for non-UUID career paths
        return {
          id: selectedCareerPath,
          title: 'UX Designer',
          average_salary: 78000
        };
      }
      
      try {
        const { data, error } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', selectedCareerPath)
          .single();
        
        if (error) {
          console.error('Career path fetch error:', error);
          return null;
        }
        
        return data;
      } catch (err) {
        console.error('Unexpected error fetching career path:', err);
        return null;
      }
    },
    enabled: !!selectedCareerPath,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Memoized goal skills using new roadmap step skills
  const goalSkills = React.useMemo(() => {
    if (!roadmapStepSkills.length) {
      // Default UX Designer skills when no roadmap is available
      return skills
        .filter(skill => 
          skill.category === 'Design' || 
          skill.name.toLowerCase().includes('figma') ||
          skill.name.toLowerCase().includes('adobe') ||
          skill.name.toLowerCase().includes('research') ||
          skill.name.toLowerCase().includes('wireframe') ||
          skill.name.toLowerCase().includes('prototype')
        )
        .slice(0, 8)
        .map(skill => skill.id);
    }
    
    // Extract skill IDs from roadmap step skills
    return roadmapStepSkills.map(item => item.skill_id);
  }, [roadmapStepSkills, skills]);

  // Find the capstone skills using roadmap step skills
  const capstoneSkillIds = React.useMemo(() => {
    if (!roadmapStepSkills.length) return [];

    return roadmapStepSkills
      .filter(item => item.roadmap_steps?.is_capstone === true)
      .map(item => item.skill_id);
  }, [roadmapStepSkills]);
  
  // Get the primary capstone skill (the very last one)
  const capstoneSkillId = React.useMemo(() => {
    return capstoneSkillIds.length > 0 ? capstoneSkillIds[0] : null;
  }, [capstoneSkillIds]);

  // Memoized checkpoint skills using roadmap step skills
  const checkpointSkills = React.useMemo(() => {
    if (!roadmapStepSkills.length) {
      // Default checkpoints for UX Designer
      return skills
        .filter(skill => 
          skill.name.toLowerCase().includes('wireframe') ||
          skill.name.toLowerCase().includes('adobe') ||
          skill.name.toLowerCase().includes('design system')
        )
        .map(skill => skill.id);
    }
    
    return roadmapStepSkills
      .filter(item => item.roadmap_steps?.is_checkpoint === true)
      .map(item => item.skill_id);
  }, [roadmapStepSkills, skills]);

  // Filter skills based on current filters
  const filteredSkills = skills.filter(skill => {
    const progress = userProgress.find(p => p.skill_id === skill.id);
    
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategories.includes(skill.category);
    const matchesRecommended = !showOnlyRecommended || recommendedSkills.includes(skill.id);
    const matchesUnlocked = !showUnlockedOnly || (progress?.status !== 'locked');
    const matchesRecommendedNext = !showRecommendedNext || recommendedSkills.includes(skill.id);
    const matchesGoalPath = !showGoalPathOnly || goalSkills.includes(skill.id);
    
    return matchesSearch && matchesCategory && matchesRecommended && matchesUnlocked && matchesRecommendedNext && matchesGoalPath;
  });

  // Calculate skill counts
  const skillCounts = {
    total: skills.length,
    completed: userProgress.filter(p => p.status === 'completed').length,
    inProgress: userProgress.filter(p => p.status === 'in_progress').length,
    recommended: recommendedSkills.length,
    withCourses: skillsWithCourses.length
  };

  const handleCategoryToggle = (category: string) => {
    setActiveCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  const handlePlanSkill = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      navigate('/mentor-chat', { 
        state: { 
          initialMessage: `I want to create a learning plan for the skill "${skill.name}". Can you help me create a detailed roadmap with milestones and resources?` 
        } 
      });
    }
  };

  const getSkillProgress = (skillId: string) => {
    return userProgress.find(p => p.skill_id === skillId);
  };

  // Debug capstone skills
  React.useEffect(() => {
    console.log('SkillTree capstone debug:', {
      capstoneSkillIds,
      capstoneSkillsInFiltered: capstoneSkillIds.filter(id => filteredSkills.some(skill => skill.id === id)),
      roadmapSteps: roadmapStepSkills.filter(item => item.roadmap_steps?.is_capstone).map(item => item.roadmap_steps?.title),
      totalRoadmapSkills: roadmapStepSkills.length
    });
  }, [capstoneSkillIds, filteredSkills, roadmapStepSkills]);

  const getSkillPrerequisites = (skillId: string) => {
    return skillEdges
      .filter(edge => edge.skill_id === skillId)
      .map(edge => {
        const prereqSkill = skills.find(s => s.id === edge.prerequisite_skill_id);
        const progress = getSkillProgress(edge.prerequisite_skill_id);
        return {
          id: edge.prerequisite_skill_id,
          name: prereqSkill?.name || 'Unknown Skill',
          completed: progress?.status === 'completed'
        };
      });
  };

  // Show error state if there are critical errors
  if (skillsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Error Loading Skills</h2>
          <p className="text-red-700">Unable to load the skill tree. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  if (skillsLoading || progressLoading || edgesLoading || categoriesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  console.log('🔍 SkillTree render - showPivotPaths:', showPivotPaths);
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Skill Tree</h1>
            <p className="text-muted-foreground">
              Visualize your learning journey and discover courses for each skill
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LocationDropdown
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
          />
          <CareerGoalDropdown 
            selectedCareerPath={selectedCareerPath}
            onCareerPathChange={setSelectedCareerPath}
          />
          <div className="flex items-center gap-2">
            <ExportTreeButton containerRef={skillTreeRef} />
            <Button 
              variant={showPivotPaths ? "default" : "outline"}
              size="sm" 
              onClick={() => {
                console.log('🔥 PIVOT BUTTON CLICKED! Current state:', showPivotPaths, 'Will become:', !showPivotPaths);
                setShowPivotPaths(!showPivotPaths);
              }}
            >
              <Route className="h-4 w-4 mr-2" />
              {showPivotPaths ? 'Hide' : 'Show'} Pivot Paths
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPerformanceTest(!showPerformanceTest)}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {showPerformanceTest ? 'Hide' : 'Show'} Performance Test
            </Button>
        </div>
      </div>

      {/* DEBUG: Show current state */}
      <div className="bg-yellow-100 border border-yellow-300 p-2 rounded mb-4">
        <p className="text-sm">🐛 DEBUG: showPivotPaths = {String(showPivotPaths)}</p>
      </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total Skills</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{skillCounts.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{skillCounts.completed}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{skillCounts.inProgress}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Recommended</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{skillCounts.recommended}</div>
        </div>
        <div className="bg-cyan-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-900">With Courses</span>
          </div>
          <div className="text-2xl font-bold text-cyan-600">{skillCounts.withCourses}</div>
        </div>
      </div>

      {/* Filters */}
      <SkillTreeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeCategories={activeCategories}
        onCategoryToggle={handleCategoryToggle}
        showOnlyRecommended={showOnlyRecommended}
        onRecommendedToggle={setShowOnlyRecommended}
        focusMode={focusMode}
        onFocusModeToggle={setFocusMode}
        showUnlockedOnly={showUnlockedOnly}
        onUnlockedOnlyToggle={setShowUnlockedOnly}
        showRecommendedNext={showRecommendedNext}
        onRecommendedNextToggle={setShowRecommendedNext}
        showGoalPathOnly={showGoalPathOnly}
        onGoalPathOnlyToggle={setShowGoalPathOnly}
        skillCounts={skillCounts}
        availableCategories={categories}
      />

      {/* Performance Test Section */}
      {showPerformanceTest && <SkillTreePerformanceTest />}

      {/* Main Content with Skill Tree and ROI Panel */}
      <div className="flex gap-6">
        {/* Simple Skill Tree */}
        <div ref={skillTreeRef} data-skill-tree-canvas className="flex-1">
           <SimpleSkillTree
             skills={filteredSkills}
             userProgress={userProgress}
             skillEdges={skillEdges}
             careerSteps={selectedCareerSteps}
             careerPathName={selectedCareerPathData?.title || "Your Career Path"}
             onSkillClick={handleSkillClick}
           />
        </div>

        {/* ROI Panel */}
        <div className="space-y-4">
          {/* Toggle between focused and relocation explorer */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant={!showRelocationExplorer ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRelocationExplorer(false)}
              className="flex items-center gap-2"
            >
              <Focus className="h-4 w-4" />
              🎯 Focused ROI
            </Button>
            <Button
              variant={showRelocationExplorer ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRelocationExplorer(true)}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              🌍 Relocation Explorer
            </Button>
          </div>

          {!showRelocationExplorer ? (
            <CareerROIPanel 
              selectedCareerPath={selectedCareerPath}
              goalSkillIds={goalSkills}
              selectedLocation={selectedLocation}
            />
          ) : (
            <LocationROIExplorer
              selectedCareerPathId={selectedCareerPath}
              goalSkillIds={goalSkills}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />
          )}
        </div>
      </div>

      {/* Skill Detail Side Panel */}
      <SkillDetailSidePanel
        skill={selectedSkill}
        userProgress={selectedSkill ? getSkillProgress(selectedSkill.id) : undefined}
        prerequisites={selectedSkill ? getSkillPrerequisites(selectedSkill.id) : []}
        open={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        onPlanSkill={handlePlanSkill}
      />
    </div>
  );
};

export default SkillTree;
