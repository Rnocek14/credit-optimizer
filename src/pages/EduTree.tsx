import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReactFlow, Node, Edge, Controls, Background, useNodesState, useEdgesState, Handle, Position, MarkerType, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { resolveEduTreeFlag, canBypassEduTreeFlag } from '@/lib/eduTreeFlags';
import { DisabledFeature } from '@/components/DisabledFeature';

interface EduCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  level_year: number;
  term: string;
  area: string;
  is_core: boolean;
  is_capstone: boolean;
  description: string;
  learning_outcomes: string[];
}

interface EduRequirement {
  id: string;
  title: string;
  kind: 'general_education' | 'major_core' | 'elective_pool' | 'capstone';
  credits_required: number;
  description: string;
  program_area: string;
  level_year: number;
}

interface EduPrereq {
  id: string;
  parent_course_id: string;
  child_course_id: string;
  prereq_type: 'prerequisite' | 'corequisite';
}

interface EduEquivalency {
  id: string;
  requirement_id?: string;
  course_id?: string;
  source: 'CLEP' | 'ACE' | 'NCCRS' | 'MOOC' | 'PORTFOLIO';
  provider: string;
  external_ref: string;
  credits: number;
  cost_estimate?: number;
  time_estimate_hours?: number;
  notes?: string;
}

// Custom course node component
function CourseNode({ data }: { data: any }) {
  const course = data.course as EduCourse;
  
  return (
    <div className="px-4 py-3 shadow-md rounded-md bg-card border-2 border-border min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="text-sm font-mono text-muted-foreground">{course.code}</div>
      <div className="font-semibold text-sm leading-tight mb-1">{course.title}</div>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">{course.credits} cr</Badge>
        <Badge variant={course.is_core ? "default" : "secondary"} className="text-xs">
          {course.area}
        </Badge>
        {course.is_capstone && <Badge variant="destructive" className="text-xs">Capstone</Badge>}
      </div>
      
      {data.equivalencies?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-primary font-medium">Alt Credit Available</div>
          <div className="text-xs text-muted-foreground">
            {data.equivalencies[0].provider} • ${data.equivalencies[0].cost_estimate || 'TBD'}
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

// Node types mapping
const nodeTypes = {
  course: CourseNode,
};

export default function EduTree() {
  const enabled = resolveEduTreeFlag();
  // TODO: Get user role from auth context when available
  const userRole = undefined; // Replace with actual user role
  const canBypass = canBypassEduTreeFlag(userRole);
  
  if (!enabled && !canBypass) {
    const handleEnableForSession = () => {
      localStorage.setItem('eduTree', 'true');
      window.location.reload();
    };

    return (
      <DisabledFeature
        title="Education-First Skill Tree"
        message="This feature is currently disabled."
        hint="Add ?eduTree=true to the URL or enable it in Admin → Feature Flags."
        onEnableForSession={handleEnableForSession}
      />
    );
  }

  return <EduTreeCanvas />;
}

// Main education tree canvas component
function EduTreeCanvas() {
  const [showSkills, setShowSkills] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [showAltCredit, setShowAltCredit] = useState(true);
  const [selectedProgram] = useState('software_engineering');

  // Fetch education data
  const { data: courses = [] } = useQuery({
    queryKey: ['edu-courses', selectedProgram],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .order('level_year', { ascending: true })
        .order('code', { ascending: true });
      
      if (error) throw error;
      return data as EduCourse[];
    },
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['edu-requirements', selectedProgram],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_requirements')
        .select('*')
        .eq('program_area', selectedProgram)
        .order('level_year', { ascending: true });
      
      if (error) throw error;
      return data as EduRequirement[];
    },
  });

  const { data: prereqs = [] } = useQuery({
    queryKey: ['edu-prereqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_prereqs')
        .select('*');
      
      if (error) throw error;
      return data as EduPrereq[];
    },
  });

  const { data: equivalencies = [] } = useQuery({
    queryKey: ['edu-equivalencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_equivalencies')
        .select('*');
      
      if (error) throw error;
      return data as EduEquivalency[];
    },
  });

  // Transform data into React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Create nodes for courses
    courses.forEach((course, index) => {
      const courseEquivalencies = equivalencies.filter(eq => eq.course_id === course.id);
      
      // Calculate position (timeline layout)
      const yearIndex = course.level_year - 1;
      const coursesInYear = courses.filter(c => c.level_year === course.level_year);
      const indexInYear = coursesInYear.findIndex(c => c.id === course.id);
      
      flowNodes.push({
        id: course.id,
        type: 'course',
        position: {
          x: yearIndex * 300,
          y: indexInYear * 120,
        },
        data: {
          course,
          equivalencies: showAltCredit ? courseEquivalencies : [],
        },
      });
    });

    // Create edges for prerequisites
    prereqs.forEach((prereq) => {
      flowEdges.push({
        id: prereq.id,
        source: prereq.parent_course_id,
        target: prereq.child_course_id,
        type: prereq.prereq_type === 'corequisite' ? 'straight' : 'smoothstep',
        style: {
          stroke: prereq.prereq_type === 'corequisite' ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: prereq.prereq_type === 'corequisite' ? 'hsl(var(--warning))' : 'hsl(var(--primary))',
        },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [courses, prereqs, equivalencies, showAltCredit]);

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes when data changes
  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  const stats = useMemo(() => {
    const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
    const coreCredits = courses.filter(c => c.is_core).reduce((sum, c) => sum + c.credits, 0);
    const altCreditsAvailable = equivalencies.length;
    
    return { totalCredits, coreCredits, altCreditsAvailable };
  }, [courses, equivalencies]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Education-First Skill Tree</h1>
            <p className="text-muted-foreground">Software Engineering Degree Path (B.S.)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Card className="p-3">
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold">{stats.totalCredits}</div>
                  <div className="text-muted-foreground">Total Credits</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{stats.coreCredits}</div>
                  <div className="text-muted-foreground">Core Credits</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{stats.altCreditsAvailable}</div>
                  <div className="text-muted-foreground">Alt Options</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch id="courses" defaultChecked disabled />
            <Label htmlFor="courses" className="text-sm">Courses</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="skills" 
              checked={showSkills}
              onCheckedChange={setShowSkills}
            />
            <Label htmlFor="skills" className="text-sm">Skills</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="jobs" 
              checked={showJobs}
              onCheckedChange={setShowJobs}
            />
            <Label htmlFor="jobs" className="text-sm">Jobs</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="alt-credit" 
              checked={showAltCredit}
              onCheckedChange={setShowAltCredit}
            />
            <Label htmlFor="alt-credit" className="text-sm">Alt Credit</Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">Fastest Path</Button>
            <Button variant="outline" size="sm">Credit-Max Path</Button>
            <Button variant="outline" size="sm">ROI-Optimized</Button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 bg-background">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </div>

      {/* Year Labels */}
      <div className="absolute bottom-4 left-4 flex gap-8 pointer-events-none">
        {[1, 2, 3, 4].map(year => (
          <div key={year} className="text-sm font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Year {year}
          </div>
        ))}
      </div>
    </div>
  );
}