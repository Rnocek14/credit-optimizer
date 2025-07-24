import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCareerGraph } from '@/hooks/useCareerGraph';

interface ReconnectionSummary {
  skillEdges: number;
  courseEdges: number;
  jobEdges: number;
  stepEdges: number;
  projectEdges: number;
  certificationEdges: number;
  totalEdges: number;
  processedNodes: number;
}

export const OrphanedNodeReconnector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReconnectionSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { nodes, edges, loading: graphLoading } = useCareerGraph();

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  const reconnectOrphanedNodes = async () => {
    setLoading(true);
    setLogs([]);
    setSummary(null);

    const summary: ReconnectionSummary = {
      skillEdges: 0,
      courseEdges: 0,
      jobEdges: 0,
      stepEdges: 0,
      projectEdges: 0,
      certificationEdges: 0,
      totalEdges: 0,
      processedNodes: 0
    };

    try {
      addLog('🔗 Starting orphaned node reconnection process...');

      if (nodes.length === 0) {
        addLog('❌ No nodes loaded. Please wait for graph to load.');
        return;
      }

      // Step 1: Find orphaned nodes
      const connectedNodeIds = new Set([
        ...edges.map(e => e.from_id),
        ...edges.map(e => e.to_id)
      ]);

      const orphanedNodes = nodes.filter(node => !connectedNodeIds.has(node.id)).slice(0, 50);

      if (orphanedNodes.length === 0) {
        addLog('✅ No orphaned nodes found!');
        setSummary(summary);
        return;
      }

      addLog(`🔍 Found ${orphanedNodes.length} orphaned nodes to process`);

      // Step 2: Process each orphaned node
      for (const orphan of orphanedNodes) {
        addLog(`\n🔧 Processing ${orphan.type}:${orphan.id}`);
        
        const edgesCreated = await reconnectNode(orphan, nodes, addLog);
        
        // Update summary
        switch (orphan.type) {
          case 'skill':
            summary.skillEdges += edgesCreated;
            break;
          case 'course':
            summary.courseEdges += edgesCreated;
            break;
          case 'job':
            summary.jobEdges += edgesCreated;
            break;
          case 'step':
            summary.stepEdges += edgesCreated;
            break;
          case 'project':
            summary.projectEdges += edgesCreated;
            break;
          case 'certification':
            summary.certificationEdges += edgesCreated;
            break;
        }
        
        summary.totalEdges += edgesCreated;
        summary.processedNodes++;
      }

      addLog('\n✅ Reconnection process completed!');
      setSummary(summary);

    } catch (error) {
      addLog(`❌ Error in reconnection process: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🔗 Orphaned Node Reconnector</CardTitle>
        <CardDescription>
          Reconnect disconnected nodes in the career graph using semantic matching rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={reconnectOrphanedNodes} 
          disabled={loading || graphLoading}
          className="w-full"
        >
          {loading ? 'Reconnecting...' : graphLoading ? 'Loading Graph...' : 'Reconnect Orphaned Nodes'}
        </Button>

        {summary && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">📊 Reconnection Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Processed Nodes: {summary.processedNodes}</div>
              <div>Total Edges: {summary.totalEdges}</div>
              <div>Skill Edges: {summary.skillEdges}</div>
              <div>Course Edges: {summary.courseEdges}</div>
              <div>Job Edges: {summary.jobEdges}</div>
              <div>Step Edges: {summary.stepEdges}</div>
              <div>Project Edges: {summary.projectEdges}</div>
              <div>Certification Edges: {summary.certificationEdges}</div>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto p-4 bg-muted rounded-lg">
            <h3 className="font-semibold sticky top-0 bg-muted">🔍 Process Log</h3>
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions for reconnection logic
async function reconnectNode(orphan: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;

  switch (orphan.type) {
    case 'skill':
      edgesCreated = await reconnectSkillNode(orphan, allNodes, addLog);
      break;
    case 'course':
      edgesCreated = await reconnectCourseNode(orphan, allNodes, addLog);
      break;
    case 'job':
      edgesCreated = await reconnectJobNode(orphan, allNodes, addLog);
      break;
    case 'step':
      edgesCreated = await reconnectStepNode(orphan, allNodes, addLog);
      break;
    case 'project':
      edgesCreated = await reconnectProjectNode(orphan, allNodes, addLog);
      break;
    case 'certification':
      edgesCreated = await reconnectCertificationNode(orphan, allNodes, addLog);
      break;
  }

  return edgesCreated;
}

async function reconnectSkillNode(skillNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const skillTitle = skillNode.title?.toLowerCase() || '';
  const skillName = skillNode.data?.name?.toLowerCase() || skillTitle;

  // Find courses that teach this skill
  const teachingCourses = allNodes.filter((node: any) => 
    node.type === 'course' && (
      node.title?.toLowerCase().includes(skillName) ||
      node.data?.skill_tags?.some((tag: string) => 
        tag.toLowerCase().includes(skillName) || skillName.includes(tag.toLowerCase())
      )
    )
  );

  // Find steps that teach this skill
  const teachingSteps = allNodes.filter((node: any) => 
    node.type === 'step' && (
      node.title?.toLowerCase().includes(skillName) ||
      node.data?.skill_keywords?.some((keyword: string) => 
        keyword.toLowerCase().includes(skillName) || skillName.includes(keyword.toLowerCase())
      )
    )
  );

  // Create edges
  for (const course of teachingCourses.slice(0, 3)) { // Limit to avoid too many edges
    await createEdge(course.id, course.type, skillNode.id, skillNode.type, 'teaches', addLog);
    edgesCreated++;
  }

  for (const step of teachingSteps.slice(0, 3)) {
    await createEdge(step.id, step.type, skillNode.id, skillNode.type, 'teaches', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function reconnectCourseNode(courseNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const courseTitle = courseNode.title?.toLowerCase() || '';
  const skillTags = courseNode.data?.skill_tags || [];

  // Find skills this course teaches
  const teachedSkills = allNodes.filter((node: any) => 
    node.type === 'skill' && (
      courseTitle.includes(node.data?.name?.toLowerCase() || node.title?.toLowerCase()) ||
      skillTags.some((tag: string) => 
        tag.toLowerCase().includes(node.data?.name?.toLowerCase() || node.title?.toLowerCase())
      )
    )
  );

  // Create edges
  for (const skill of teachedSkills.slice(0, 5)) {
    await createEdge(courseNode.id, courseNode.type, skill.id, skill.type, 'teaches', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function reconnectJobNode(jobNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const jobTitle = jobNode.title?.toLowerCase() || '';

  // Find skills that qualify for this job using keyword matching
  const qualifyingSkills = allNodes.filter((node: any) => 
    node.type === 'skill' && 
    isJobRelevantSkill(jobTitle, node.data?.name?.toLowerCase() || node.title?.toLowerCase())
  );

  // Create edges
  for (const skill of qualifyingSkills.slice(0, 8)) {
    await createEdge(skill.id, skill.type, jobNode.id, jobNode.type, 'qualifies_for', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function reconnectStepNode(stepNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const stepTitle = stepNode.title?.toLowerCase() || '';

  // Find skills this step teaches
  const teachedSkills = allNodes.filter((node: any) => 
    node.type === 'skill' && 
    stepTitle.includes(node.data?.name?.toLowerCase() || node.title?.toLowerCase())
  );

  // Create edges
  for (const skill of teachedSkills.slice(0, 3)) {
    await createEdge(stepNode.id, stepNode.type, skill.id, skill.type, 'teaches', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function reconnectProjectNode(projectNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const skillsDemonstrated = projectNode.data?.skills_demonstrated || [];

  // Find skills this project validates
  const validatedSkills = allNodes.filter((node: any) => 
    node.type === 'skill' && 
    skillsDemonstrated.some((skill: string) => 
      skill.toLowerCase().includes(node.data?.name?.toLowerCase() || node.title?.toLowerCase())
    )
  );

  // Create edges
  for (const skill of validatedSkills.slice(0, 5)) {
    await createEdge(projectNode.id, projectNode.type, skill.id, skill.type, 'validates', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function reconnectCertificationNode(certNode: any, allNodes: any[], addLog: (msg: string) => void): Promise<number> {
  let edgesCreated = 0;
  const skillsValidated = certNode.data?.skills_validated || [];

  // Find skills this certification validates
  const validatedSkills = allNodes.filter((node: any) => 
    node.type === 'skill' && 
    skillsValidated.some((skill: string) => 
      skill.toLowerCase().includes(node.data?.name?.toLowerCase() || node.title?.toLowerCase())
    )
  );

  // Create edges
  for (const skill of validatedSkills.slice(0, 5)) {
    await createEdge(certNode.id, certNode.type, skill.id, skill.type, 'validates', addLog);
    edgesCreated++;
  }

  return edgesCreated;
}

async function createEdge(
  fromId: string, 
  fromType: string, 
  toId: string, 
  toType: string, 
  edgeType: string,
  addLog: (msg: string) => void
): Promise<void> {
  const { error } = await supabase
    .from('career_graph_edges')
    .insert({
      from_id: fromId,
      from_type: fromType,
      to_id: toId,
      to_type: toType,
      edge_type: edgeType,
      importance_weight: 1.0,
      time_cost_hours: 0,
      monetary_cost: 0,
      difficulty_multiplier: 1.0
    });

  if (error) {
    addLog(`❌ Error creating edge ${fromType}:${fromId} → ${toType}:${toId}: ${error.message}`);
  } else {
    addLog(`   ${fromType}:${fromId} → ${toType}:${toId} (${edgeType})`);
  }
}

function isJobRelevantSkill(jobTitle: string, skillName: string): boolean {
  const jobSkillMappings: Record<string, string[]> = {
    'data scientist': ['python', 'machine learning', 'statistics', 'sql', 'pandas', 'numpy', 'scikit-learn', 'tensorflow'],
    'data analyst': ['sql', 'excel', 'tableau', 'python', 'statistics', 'power bi', 'r'],
    'software engineer': ['programming', 'algorithms', 'data structures', 'java', 'python', 'javascript'],
    'web developer': ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'node.js'],
    'devops': ['docker', 'kubernetes', 'aws', 'linux', 'terraform', 'jenkins', 'git'],
    'product manager': ['product management', 'strategy', 'analytics', 'agile', 'scrum'],
    'business analyst': ['business analysis', 'requirements', 'process improvement', 'sql'],
    'marketing': ['marketing', 'digital marketing', 'seo', 'social media', 'analytics'],
    'designer': ['design', 'ui', 'ux', 'figma', 'photoshop', 'illustrator'],
    'project manager': ['project management', 'agile', 'scrum', 'planning', 'risk management']
  };
  
  for (const [job, skills] of Object.entries(jobSkillMappings)) {
    if (jobTitle.includes(job)) {
      return skills.some(skill => 
        skillName.includes(skill) || 
        skill.includes(skillName) ||
        (skillName.length > 3 && skill.includes(skillName.substring(0, skillName.length - 1)))
      );
    }
  }
  
  return false;
}