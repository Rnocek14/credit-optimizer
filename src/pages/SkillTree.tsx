import React, { useState, useEffect, useRef } from 'react';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { SkillTreeFilters } from '@/components/SkillTreeFilters';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { SkillDetailSidePanel } from '@/components/SkillDetailSidePanel';
import { SkillTreePerformanceTest } from '@/components/SkillTreePerformanceTest';
import { ExportTreeButton } from '@/components/ExportTreeButton';
import { CareerGoalDropdown } from '@/components/CareerGoalDropdown';
import { CareerROIPanel } from '@/components/CareerROIPanel';
import { LocationDropdown } from '@/components/LocationDropdown';
import { LocationROIExplorer } from '@/components/LocationROIExplorer';
import { CareerPathfindingPanel } from '@/components/CareerPathfindingPanel';
import { EnhancedLayoutControls } from '@/components/EnhancedLayoutControls';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Target, Award, TestTube, Globe, Focus, Route } from 'lucide-react';
import type { GraphNode } from '@/lib/careerGraph';

const SkillTree = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
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
  const [showPathfinding, setShowPathfinding] = useState(false);
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure'>('semantic-hierarchy');
  const [showLayoutControls, setShowLayoutControls] = useState(false);

  // Use the unified career graph system
  const {
    graph,
    nodes,
    edges,
    loading,
    error,
    statistics,
    reload,
    findOptimalPaths,
    findPivotOpportunities,
    calculateCRI,
    getNode,
    getNodesByType,
    searchNodes,
    isEmpty,
    hasJobs,
    hasSkills,
    hasCourses,
    hasProjects,
    hasCertifications,
    hasSteps
  } = useCareerGraph({ careerPathId: selectedCareerPath });

  // Extract different node types for UI
  const skills = getNodesByType('skill');
  const jobs = getNodesByType('job');
  const courses = getNodesByType('course');
  const projects = getNodesByType('project');
  const certifications = getNodesByType('certification');
  const steps = getNodesByType('step');

  // Get categories from skills - simplified approach
  const categories = ['Programming', 'Framework', 'Backend', 'Design', 'API', 'Cloud', 'DevOps'];

  // Initialize activeCategories with all categories once they're loaded
  useEffect(() => {
    if (categories.length > 0 && activeCategories.length === 0) {
      setActiveCategories(categories);
    }
  }, [categories, activeCategories.length]);

  // Filter nodes based on current filters
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Filter skills specifically 
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         skill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    // Skills don't have category directly on GraphNode, need to check original data
    return matchesSearch;
  });

  // Calculate skill counts
  const skillCounts = {
    total: skills.length,
    completed: 0, // TODO: Get from user progress
    inProgress: 0, // TODO: Get from user progress
    recommended: 0 // TODO: Calculate recommendations
  };

  const handleCategoryToggle = (category: string) => {
    setActiveCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handlePlanSkill = (nodeId: string) => {
    const node = getNode('skill', nodeId);
    if (node) {
      navigate('/mentor-chat', { 
        state: { 
          initialMessage: `I want to create a learning plan for the skill "${node.title}". Can you help me create a detailed roadmap with milestones and resources?` 
        } 
      });
    }
  };

  // Show error state if there are critical errors
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Error Loading Career Graph</h2>
          <p className="text-red-700">{error}</p>
          <Button onClick={reload} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
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

  console.log('🔍 SkillTree render - Career Graph loaded:', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    skillsCount: skills.length,
    jobsCount: jobs.length,
    statistics
  });
  
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
            <h1 className="text-3xl font-bold">Career Graph</h1>
            <p className="text-muted-foreground">
              Explore your unified career journey with skills, jobs, courses, and pathfinding
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
              onClick={() => setShowPivotPaths(!showPivotPaths)}
            >
              <Route className="h-4 w-4 mr-2" />
              {showPivotPaths ? 'Hide' : 'Show'} Pivot Paths
            </Button>
            <Button 
              variant={showPathfinding ? "default" : "outline"}
              size="sm" 
              onClick={() => setShowPathfinding(!showPathfinding)}
            >
              <Target className="h-4 w-4 mr-2" />
              {showPathfinding ? 'Hide' : 'Show'} Pathfinding
            </Button>
            <Button 
              variant={showLayoutControls ? "default" : "outline"}
              size="sm" 
              onClick={() => setShowLayoutControls(!showLayoutControls)}
            >
              <Focus className="h-4 w-4 mr-2" />
              {showLayoutControls ? 'Hide' : 'Show'} Layout Controls
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
      </div>

      {/* Career Graph Statistics */}
      {statistics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Career Graph Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="font-medium">Total Nodes</p>
              <p className="text-2xl font-bold">{statistics.totalNodes}</p>
            </div>
            <div>
              <p className="font-medium">Skills</p>
              <p className="text-xl font-bold">{statistics.nodesByType.skill || 0}</p>
            </div>
            <div>
              <p className="font-medium">Jobs</p>
              <p className="text-xl font-bold">{statistics.nodesByType.job || 0}</p>
            </div>
            <div>
              <p className="font-medium">Courses</p>
              <p className="text-xl font-bold">{statistics.nodesByType.course || 0}</p>
            </div>
            <div>
              <p className="font-medium">Projects</p>
              <p className="text-xl font-bold">{statistics.nodesByType.project || 0}</p>
            </div>
            <div>
              <p className="font-medium">Connections</p>
              <p className="text-xl font-bold">{statistics.totalEdges}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card text-card-foreground p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Skills</p>
              <p className="text-2xl font-bold">{skills.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Jobs</p>
              <p className="text-2xl font-bold">{jobs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Focus className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Courses</p>
              <p className="text-2xl font-bold">{courses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium">Projects</p>
              <p className="text-2xl font-bold">{projects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium">Certifications</p>
              <p className="text-2xl font-bold">{certifications.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <SkillTreeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeCategories={activeCategories}
        availableCategories={categories}
        onCategoryToggle={handleCategoryToggle}
        showOnlyRecommended={showOnlyRecommended}
        onRecommendedToggle={setShowOnlyRecommended}
        showUnlockedOnly={showUnlockedOnly}
        onUnlockedOnlyToggle={setShowUnlockedOnly}
        showRecommendedNext={showRecommendedNext}
        onRecommendedNextToggle={setShowRecommendedNext}
        showGoalPathOnly={showGoalPathOnly}
        onGoalPathOnlyToggle={setShowGoalPathOnly}
        focusMode={focusMode}
        onFocusModeToggle={setFocusMode}
        skillCounts={skillCounts}
      />

      {/* Performance Test (optional) */}
      {showPerformanceTest && (
        <SkillTreePerformanceTest />
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Career Graph Visualization */}
        <div className="lg:col-span-3">
          <div 
            ref={skillTreeRef}
            className="bg-card text-card-foreground border rounded-lg overflow-hidden relative"
            style={{ height: '800px' }}
          >
            <UnifiedCareerCanvas
              nodes={filteredNodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              searchTerm={searchTerm}
              selectedCareerPath={selectedCareerPath}
              layoutAlgorithm={layoutAlgorithm}
              focusMode={focusMode}
            />
            
            {/* Enhanced Layout Controls Overlay */}
            {showLayoutControls && (
              <div className="absolute top-4 right-4 z-10">
                <EnhancedLayoutControls
                  layoutAlgorithm={layoutAlgorithm}
                  onLayoutAlgorithmChange={setLayoutAlgorithm}
                  focusMode={focusMode}
                  onFocusModeChange={setFocusMode}
                  goalPathVisible={showGoalPathOnly}
                  onGoalPathVisibleChange={setShowGoalPathOnly}
                  selectedCareerPath={selectedCareerPath}
                  onRecalculateLayout={() => {
                    // Force re-render by updating algorithm state
                    setLayoutAlgorithm(curr => curr);
                  }}
                  onResetView={() => {
                    setLayoutAlgorithm('semantic-hierarchy');
                    setFocusMode(false);
                    setShowGoalPathOnly(false);
                  }}
                  statistics={{
                    nodeCount: filteredNodes.length,
                    edgeCount: edges.length
                  }}
                  activeFilters={[
                    ...(searchTerm ? [`Search: ${searchTerm}`] : []),
                    ...(selectedCareerPath ? [`Career: ${selectedCareerPath}`] : []),
                    ...(activeCategories.length < categories.length ? activeCategories.map(cat => `Category: ${cat}`) : [])
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1 space-y-4">
          {showPathfinding && (
            <CareerPathfindingPanel
              nodes={nodes}
              edges={edges}
              findOptimalPaths={findOptimalPaths}
              findPivotOpportunities={findPivotOpportunities}
              calculateCRI={calculateCRI}
            />
          )}
          
          {showRelocationExplorer ? (
            <LocationROIExplorer
              selectedCareerPathId={selectedCareerPath}
              goalSkillIds={[]}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />
          ) : (
            <CareerROIPanel 
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              goalSkillIds={[]}
            />
          )}
        </div>
      </div>

      {/* Node Detail Side Panel */}
      {selectedNode && selectedNode.type === 'skill' && (
        <SkillDetailSidePanel
          skill={{
            id: selectedNode.id,
            name: selectedNode.title,
            category: 'Unknown',
            description: selectedNode.description,
            xp_value: 100,
            difficulty_level: 1
          }}
          userProgress={undefined} // TODO: Get from unified user progress
          prerequisites={[]} // TODO: Calculate from edges
          open={!!selectedNode}
          onClose={() => setSelectedNode(null)}
          onPlanSkill={handlePlanSkill}
        />
      )}
    </div>
  );
};

export default SkillTree;