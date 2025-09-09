import React, { useState, useMemo } from 'react';
import { ReactFlow, Node, Edge, Background, Controls, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, GraduationCap, Award, Clock, DollarSign, Target, BookMarked, Brain, Lightbulb, Trophy, Briefcase } from 'lucide-react';

interface EducationNode {
  id: string;
  title: string;
  courseNumber?: string; // e.g., "MATH-101", "CS-201"
  type: 'foundational' | 'core' | 'advanced' | 'capstone' | 'credential' | 'career';
  level: number; // 0-5 (0=foundational, 1-2=core, 3-4=advanced, 5=credential/career)
  subject: string; // e.g., "Mathematics", "Computer Science", "General Education"
  credits?: number;
  cost?: number;
  duration?: string;
  prerequisites: string[];
  creditGate?: number; // Minimum credits needed to enroll
  gpaGate?: number; // Minimum GPA required
  coRequisites?: string[]; // Must be taken together
  alternativePrereqs?: string[][]; // OR logic - array of arrays
  description: string;
  institution?: string;
}

const educationData: EducationNode[] = [
  // Level 0: Foundational Skills
  {
    id: 'basic-literacy',
    title: 'Academic Reading & Writing',
    type: 'foundational',
    level: 0,
    subject: 'General Education',
    duration: '1-2 months',
    cost: 0,
    prerequisites: [],
    description: 'Essential reading comprehension and writing skills for college success'
  },
  {
    id: 'basic-math',
    title: 'Basic Mathematics',
    type: 'foundational', 
    level: 0,
    subject: 'Mathematics',
    duration: '2-3 months',
    cost: 0,
    prerequisites: [],
    description: 'Arithmetic, fractions, percentages, and pre-algebra fundamentals'
  },
  {
    id: 'study-skills',
    title: 'College Success Skills',
    type: 'foundational',
    level: 0,
    subject: 'General Education',
    duration: '1 month',
    cost: 0,
    prerequisites: [],
    description: 'Time management, note-taking, and effective study strategies'
  },

  // Level 1: Core Foundation Courses (0-30 credits)
  {
    id: 'english-comp-1',
    title: 'English Composition I',
    courseNumber: 'ENG-101',
    type: 'core',
    level: 1,
    subject: 'English',
    credits: 3,
    cost: 1200,
    duration: '16 weeks',
    prerequisites: ['basic-literacy'],
    description: 'Academic writing, research skills, and critical thinking'
  },
  {
    id: 'college-algebra',
    title: 'College Algebra',
    courseNumber: 'MATH-110',
    type: 'core',
    level: 1,
    subject: 'Mathematics',
    credits: 3,
    cost: 1200,
    duration: '16 weeks',
    prerequisites: ['basic-math'],
    description: 'Functions, equations, graphing, and algebraic problem-solving'
  },
  {
    id: 'intro-psychology',
    title: 'Introduction to Psychology',
    courseNumber: 'PSY-101',
    type: 'core',
    level: 1,
    subject: 'Psychology',
    credits: 3,
    cost: 1200,
    duration: '16 weeks',
    prerequisites: ['basic-literacy'],
    description: 'Fundamentals of human behavior and mental processes'
  },

  // Level 2: Core Discipline Courses (30-60 credits)
  {
    id: 'english-comp-2',
    title: 'English Composition II',
    courseNumber: 'ENG-102',
    type: 'core',
    level: 2,
    subject: 'English',
    credits: 3,
    cost: 1200,
    duration: '16 weeks',
    prerequisites: ['english-comp-1'],
    creditGate: 15,
    description: 'Advanced composition, argumentation, and research methods'
  },
  {
    id: 'intro-programming',
    title: 'Introduction to Programming',
    courseNumber: 'CS-101',
    type: 'core',
    level: 2,
    subject: 'Computer Science',
    credits: 4,
    cost: 1600,
    duration: '16 weeks',
    prerequisites: ['college-algebra'],
    creditGate: 15,
    description: 'Programming fundamentals using Python, problem-solving techniques'
  },
  {
    id: 'calculus-1',
    title: 'Calculus I',
    courseNumber: 'MATH-201',
    type: 'core',
    level: 2,
    subject: 'Mathematics',
    credits: 4,
    cost: 1600,
    duration: '16 weeks',
    prerequisites: ['college-algebra'],
    creditGate: 20,
    description: 'Limits, derivatives, and applications of differential calculus'
  },

  // Level 3: Advanced Courses (60-90 credits)
  {
    id: 'data-structures',
    title: 'Data Structures & Algorithms',
    courseNumber: 'CS-201',
    type: 'advanced',
    level: 3,
    subject: 'Computer Science',
    credits: 4,
    cost: 1800,
    duration: '16 weeks',
    prerequisites: ['intro-programming'],
    creditGate: 45,
    description: 'Arrays, linked lists, trees, graphs, and algorithmic analysis'
  },
  {
    id: 'database-systems',
    title: 'Database Systems',
    courseNumber: 'CS-301',
    type: 'advanced',
    level: 3,
    subject: 'Computer Science',
    credits: 3,
    cost: 1800,
    duration: '16 weeks',  
    prerequisites: ['data-structures'],
    creditGate: 60,
    description: 'Database design, SQL, normalization, and database management'
  },
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    courseNumber: 'CS-401',
    type: 'advanced',
    level: 4,
    subject: 'Computer Science',
    credits: 3,
    cost: 2000,
    duration: '16 weeks',
    prerequisites: ['data-structures'],
    creditGate: 75,
    description: 'Software development lifecycle, design patterns, and project management'
  },

  // Level 4: Capstone Projects (90-120 credits)
  {
    id: 'senior-project',
    title: 'Senior Capstone Project',
    courseNumber: 'CS-499',
    type: 'capstone',
    level: 4,
    subject: 'Computer Science',
    credits: 6,
    cost: 2400,
    duration: '32 weeks',
    prerequisites: ['software-engineering', 'database-systems'],
    creditGate: 105,
    gpaGate: 2.5,
    description: 'Independent project demonstrating mastery of CS concepts'
  },

  // Level 5: Credentials
  {
    id: 'associate-cs',
    title: 'Associate in Computer Science',
    type: 'credential',
    level: 5,
    subject: 'Computer Science',
    credits: 60,
    cost: 24000,
    duration: '2 years',
    prerequisites: ['intro-programming', 'english-comp-2'],
    creditGate: 60,
    description: 'Two-year degree focusing on programming and CS fundamentals'
  },
  {
    id: 'bachelor-cs',
    title: 'Bachelor in Computer Science',
    type: 'credential',
    level: 5,
    subject: 'Computer Science',
    credits: 120,
    cost: 48000,
    duration: '4 years',
    prerequisites: ['senior-project'],
    creditGate: 120,
    gpaGate: 2.0,
    description: 'Four-year degree with comprehensive CS education and specializations'
  },

  // Career Level
  {
    id: 'junior-developer',
    title: 'Junior Software Developer',
    type: 'career',
    level: 5,
    subject: 'Technology',
    cost: 0,
    duration: '1-3 years experience',
    prerequisites: ['associate-cs'],
    description: 'Entry-level programming position with mentorship and training'
  },
  {
    id: 'software-developer',
    title: 'Software Developer',
    type: 'career',
    level: 5,
    subject: 'Technology', 
    cost: 0,
    duration: '3+ years experience',
    prerequisites: ['bachelor-cs'],
    description: 'Independent software development role with full project ownership'
  }
];

const LevelBand = ({ level, y, height }: { level: number, y: number, height: number }) => {
  const getLevelInfo = () => {
    switch (level) {
      case 0: return { name: 'Foundational Skills', credits: '0 credits', color: 'bg-slate-50/50' };
      case 1: return { name: 'Core Foundation', credits: '0-30 credits', color: 'bg-blue-50/50' };
      case 2: return { name: 'Core Discipline', credits: '30-60 credits', color: 'bg-green-50/50' };
      case 3: return { name: 'Advanced Studies', credits: '60-90 credits', color: 'bg-orange-50/50' };
      case 4: return { name: 'Capstone & Mastery', credits: '90-120 credits', color: 'bg-purple-50/50' };
      case 5: return { name: 'Credentials & Career', credits: '120+ credits', color: 'bg-amber-50/50' };
      default: return { name: 'Unknown', credits: '', color: 'bg-gray-50/50' };
    }
  };

  const levelInfo = getLevelInfo();

  return (
    <div 
      className={`absolute left-0 right-0 border-b border-dashed border-border/30 ${levelInfo.color}`}
      style={{ top: y, height }}
    >
      <div className="absolute left-4 top-2 text-sm font-medium text-muted-foreground">
        <div className="font-semibold">{levelInfo.name}</div>
        <div className="text-xs opacity-70">{levelInfo.credits}</div>
      </div>
    </div>
  );
};

const CustomNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'foundational': return <Lightbulb className="w-4 h-4" />;
      case 'core': return <BookOpen className="w-4 h-4" />;
      case 'advanced': return <Brain className="w-4 h-4" />;
      case 'capstone': return <Target className="w-4 h-4" />;
      case 'credential': return <GraduationCap className="w-4 h-4" />;
      case 'career': return <Briefcase className="w-4 h-4" />;
      default: return <BookMarked className="w-4 h-4" />;
    }
  };

  const getSubjectColor = () => {
    switch (data.subject) {
      case 'Mathematics': return 'border-blue-300 bg-blue-50 text-blue-900';
      case 'Computer Science': return 'border-green-300 bg-green-50 text-green-900';
      case 'English': return 'border-purple-300 bg-purple-50 text-purple-900';
      case 'Psychology': return 'border-pink-300 bg-pink-50 text-pink-900';
      case 'General Education': return 'border-gray-300 bg-gray-50 text-gray-900';
      case 'Technology': return 'border-orange-300 bg-orange-50 text-orange-900';
      default: return 'border-slate-300 bg-slate-50 text-slate-900';
    }
  };

  const getLevelIntensity = () => {
    // Higher levels get more intense styling
    const intensities = ['opacity-70', 'opacity-80', 'opacity-90', '', 'ring-1', 'ring-2'];
    return intensities[data.level] || '';
  };

  return (
    <div className={`
      p-3 rounded-lg border-2 min-w-[220px] max-w-[280px] 
      ${getSubjectColor()} ${getLevelIntensity()}
      shadow-sm hover:shadow-md transition-all duration-200
    `}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {getIcon()}
          <div className="flex-1">
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            {data.courseNumber && (
              <div className="text-xs text-muted-foreground font-mono">{data.courseNumber}</div>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 ml-2">
          L{data.level}
        </Badge>
      </div>
      
      <p className="text-xs mb-3 text-muted-foreground leading-relaxed line-clamp-3">
        {data.description}
      </p>
      
      <div className="flex flex-wrap gap-1">
        {data.credits && (
          <Badge variant="secondary" className="text-xs">
            {data.credits} cr
          </Badge>
        )}
        {data.creditGate && (
          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
            {data.creditGate}+ req
          </Badge>
        )}
        {data.gpaGate && (
          <Badge variant="outline" className="text-xs border-red-300 text-red-700">
            {data.gpaGate} GPA
          </Badge>
        )}
        {data.cost !== undefined && (
          <Badge variant="outline" className="text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            {data.cost === 0 ? 'Free' : `$${(data.cost/1000).toFixed(0)}k`}
          </Badge>
        )}
        {data.duration && data.type !== 'career' && (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {data.duration.replace(' weeks', 'w').replace('16 weeks', '1 sem')}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default function EducationTree() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());

  // Calculate academic progression metrics
  const progressMetrics = useMemo(() => {
    const completed = Array.from(completedNodes).map(id => 
      educationData.find(n => n.id === id)
    ).filter(Boolean) as EducationNode[];
    
    const totalCredits = completed.reduce((sum, node) => sum + (node.credits || 0), 0);
    const totalCost = completed.reduce((sum, node) => sum + (node.cost || 0), 0);
    
    const levelProgress = [0, 1, 2, 3, 4, 5].map(level => {
      const levelNodes = educationData.filter(n => n.level === level);
      const completedLevelNodes = completed.filter(n => n.level === level);
      return {
        level,
        total: levelNodes.length,
        completed: completedLevelNodes.length,
        percentage: levelNodes.length > 0 ? (completedLevelNodes.length / levelNodes.length) * 100 : 0
      };
    });

    return { totalCredits, totalCost, levelProgress };
  }, [completedNodes]);

  // Create nodes and edges with level-based layout
  const { nodes, edges, levelBands } = useMemo(() => {
    // Group nodes by academic level for layout
    const nodesByLevel: { [level: number]: EducationNode[] } = {};
    educationData.forEach(node => {
      if (!nodesByLevel[node.level]) nodesByLevel[node.level] = [];
      nodesByLevel[node.level].push(node);
    });

    // Create React Flow nodes with level-based positioning
    const flowNodes: Node[] = [];
    const levelHeight = 180;
    const nodeSpacing = 300;
    
    Object.keys(nodesByLevel).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesInLevel = nodesByLevel[level];
      
      // Sort nodes within level by subject, then by prerequisites
      const sortedNodes = nodesInLevel.sort((a, b) => {
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        return a.prerequisites.length - b.prerequisites.length;
      });
      
      sortedNodes.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: 'custom',
          position: {
            x: index * nodeSpacing + 50,
            y: level * levelHeight + 40
          },
          data: {
            ...node,
            isSelected: selectedNode === node.id,
            isCompleted: completedNodes.has(node.id)
          },
          draggable: true
        });
      });
    });

    // Create level bands for visual organization
    const bands = Object.keys(nodesByLevel).map(levelStr => {
      const level = parseInt(levelStr);
      return {
        level,
        y: level * levelHeight,
        height: levelHeight
      };
    });

    // Create edges based on prerequisites with enhanced styling
    const flowEdges: Edge[] = [];
    educationData.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const isHighlighted = selectedNode === prereqId || selectedNode === node.id;
        const isCompleted = completedNodes.has(prereqId) && completedNodes.has(node.id);
        
        flowEdges.push({
          id: `${prereqId}-${node.id}`,
          source: prereqId,
          target: node.id,
          type: 'smoothstep',
          animated: isHighlighted,
          style: {
            stroke: isCompleted ? 'hsl(var(--success))' : 
                   isHighlighted ? 'hsl(var(--primary))' : 
                   'hsl(var(--muted-foreground)/0.6)',
            strokeWidth: isHighlighted ? 3 : isCompleted ? 2 : 1,
            strokeDasharray: node.creditGate ? '5,5' : undefined
          },
          sourceHandle: 'right',
          targetHandle: 'left',
          label: node.creditGate ? `${node.creditGate}+ credits` : undefined,
          labelStyle: { fontSize: '10px', fontWeight: 500 }
        });
      });
    });

    return { nodes: flowNodes, edges: flowEdges, levelBands: bands };
  }, [selectedNode, completedNodes]);

  const nodeTypes = {
    custom: CustomNode
  };

  const selectedNodeData = selectedNode ? educationData.find(n => n.id === selectedNode) : null;

  const handleNodeClick = (event: any, node: Node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id);
  };

  const toggleNodeCompletion = (nodeId: string) => {
    setCompletedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getNextAvailableCourses = () => {
    return educationData.filter(node => {
      if (completedNodes.has(node.id)) return false;
      
      // Check if all prerequisites are met
      const prereqsMet = node.prerequisites.every(prereqId => 
        completedNodes.has(prereqId)
      );
      
      // Check credit gate
      const creditGateMet = !node.creditGate || 
        progressMetrics.totalCredits >= node.creditGate;
      
      return prereqsMet && creditGateMet;
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Leveled Education Tree</h1>
        <p className="text-muted-foreground">
          Academic progression from foundational skills to career readiness with proper prerequisites and credit tracking.
        </p>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{progressMetrics.totalCredits}</div>
            <p className="text-sm text-muted-foreground">Credits Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${(progressMetrics.totalCost / 1000).toFixed(0)}k
            </div>
            <p className="text-sm text-muted-foreground">Investment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{completedNodes.size}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{getNextAvailableCourses().length}</div>
            <p className="text-sm text-muted-foreground">Available Next</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
        {/* Enhanced Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Node Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {selectedNodeData ? 'Course Details' : 'Academic Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNodeData ? (
                <div className="space-y-4">
                  {/* Course Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{selectedNodeData.title}</h3>
                      <Button 
                        size="sm" 
                        variant={completedNodes.has(selectedNodeData.id) ? "destructive" : "default"}
                        onClick={() => toggleNodeCompletion(selectedNodeData.id)}
                      >
                        {completedNodes.has(selectedNodeData.id) ? 'Uncomplete' : 'Complete'}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {selectedNodeData.type}
                      </Badge>
                      <Badge variant="secondary">
                        Level {selectedNodeData.level}
                      </Badge>
                      {selectedNodeData.courseNumber && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {selectedNodeData.courseNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {selectedNodeData.description}
                  </p>
                  
                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedNodeData.credits && (
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedNodeData.credits} cr</span>
                      </div>
                    )}
                    
                    {selectedNodeData.cost !== undefined && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedNodeData.cost === 0 ? 'Free' : `$${(selectedNodeData.cost/1000).toFixed(1)}k`}</span>
                      </div>
                    )}
                    
                    {selectedNodeData.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedNodeData.duration}</span>
                      </div>
                    )}
                    
                    {selectedNodeData.subject && (
                      <div className="flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedNodeData.subject}</span>
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  {(selectedNodeData.prerequisites.length > 0 || selectedNodeData.creditGate || selectedNodeData.gpaGate) && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Requirements:</h4>
                      <div className="space-y-2">
                        {selectedNodeData.creditGate && (
                          <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded">
                            <strong>Credit Gate:</strong> {selectedNodeData.creditGate}+ credits required
                          </div>
                        )}
                        {selectedNodeData.gpaGate && (
                          <div className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                            <strong>GPA Requirement:</strong> {selectedNodeData.gpaGate} minimum
                          </div>
                        )}
                        {selectedNodeData.prerequisites.length > 0 && (
                          <div>
                            <div className="text-xs font-medium mb-1">Prerequisites:</div>
                            {selectedNodeData.prerequisites.map(prereqId => {
                              const prereq = educationData.find(n => n.id === prereqId);
                              const isCompleted = completedNodes.has(prereqId);
                              return prereq ? (
                                <div key={prereqId} className={`text-xs flex items-center gap-2 ${
                                  isCompleted ? 'text-green-600' : 'text-muted-foreground'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                  }`} />
                                  {prereq.title}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Level-based academic progression system. Click on any course to see details.
                  </p>
                  
                  {/* Level Progress */}
                  <div>
                    <h4 className="font-medium text-sm mb-3">Level Progress:</h4>
                    <div className="space-y-3">
                      {progressMetrics.levelProgress.map(({ level, completed, total, percentage }) => (
                        <div key={level}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Level {level}</span>
                            <span>{completed}/{total}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getNextAvailableCourses().slice(0, 5).map(course => (
                  <div key={course.id} className="text-xs p-2 bg-muted rounded cursor-pointer hover:bg-muted/70"
                       onClick={() => setSelectedNode(course.id)}>
                    <div className="font-medium">{course.title}</div>
                    <div className="text-muted-foreground">Level {course.level} • {course.subject}</div>
                  </div>
                ))}
                {getNextAvailableCourses().length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Complete prerequisites to unlock more courses.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tree View with Level Bands */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="p-0 h-full relative">
              {/* Level bands overlay */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {levelBands.map(({ level, y, height }) => (
                  <LevelBand key={level} level={level} y={y} height={height} />
                ))}
              </div>
              
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                className="w-full h-full"
                minZoom={0.3}
                maxZoom={1.5}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}