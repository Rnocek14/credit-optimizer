/**
 * EduTree V4 Canvas - React Flow canvas with ELK layout
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Node, 
  Edge,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PlanNode, PlanEdge, NodeType, EdgeType, OverlayState, DegreeRequirements } from '../types/v4';
import { hybridSpineLayout, enrichYearNodesWithSummaries, groupCoursesByModule, calculateModuleCardPositions } from '../engine/layoutEngine';
import { validateDegree } from '../engine/degreeValidator';
import { DegreeValidationPanel } from './DegreeValidationPanel';
import { CourseSelectionPanel } from './CourseSelectionPanel';
import { ComplianceScorePanel } from './ComplianceScorePanel';
import { CreditPolicyEngine, DEFAULT_FL_POLICY } from '../engine/CreditPolicyEngine';
import { SpineNode } from './nodes/SpineNode';
import { CourseNode } from './nodes/CourseNode';
import { GhostCourseNode } from './nodes/GhostCourseNode';
import { ExternalNode } from './nodes/ExternalNode';
import { ModuleCard } from './nodes/ModuleCard';
import { ModuleBundleNode } from './nodes/ModuleBundleNode';
import { TransferEdge } from './edges/TransferEdge';
import { CompareEdge } from './edges/CompareEdge';
import { ExportPlanButton } from './ExportPlanButton';
import { SharePlanDialog } from './SharePlanDialog';
import { BadgeLegend } from './BadgeLegend';
import { ModuleToolbar } from './ModuleToolbar';
import { MarketplaceCourse } from '@/hooks/useCourseMarketplace';
import '../styles/v4-canvas.css';
import '../styles/EduTreeV4.css';

// CS Degree Requirements with granular sub-requirements
const CS_DEGREE_REQUIREMENTS: DegreeRequirements = {
  totalCredits: 120,
  categories: {
    coreCS: { required: 45, label: 'Core CS' },
    math: { required: 20, label: 'Math & Science' },
    genEd: { required: 30, label: 'General Education' },
    elective: { required: 19, label: 'Electives' },
    capstone: { required: 6, label: 'Capstone' }
  },
  residencyMinimum: 30,
  subRequirements: [
    // Core CS breakdown
    {
      id: 'cs-foundations',
      label: 'CS Foundations',
      category: 'coreCS',
      type: 'all-required',
      courseIds: ['CS101', 'CS102', 'CS201', 'CS202', 'CS205'],
      description: 'Core programming and data structures',
      icon: '💻',
    },
    {
      id: 'cs-systems',
      label: 'Systems & Architecture',
      category: 'coreCS',
      type: 'all-required',
      courseIds: ['CS301', 'CS305', 'CS310', 'CS410'],
      description: 'Low-level systems programming',
      icon: '⚙️',
    },
    {
      id: 'math-calculus',
      label: 'Calculus Sequence',
      category: 'math',
      type: 'all-required',
      courseIds: ['MATH151', 'MATH152'],
      description: 'Calculus I & II',
      icon: '📐',
    },
    {
      id: 'math-advanced',
      label: 'Advanced Math',
      category: 'math',
      type: 'all-required',
      courseIds: ['MATH251', 'STAT220'],
      description: 'Linear algebra and statistics',
      icon: '📊',
    },
    {
      id: 'math-science',
      label: 'Physics Sequence',
      category: 'math',
      type: 'all-required',
      courseIds: ['PHYS211', 'PHYS212'],
      description: 'Physics for engineers',
      icon: '⚛️',
    },
    {
      id: 'genEd-humanities',
      label: 'Humanities',
      category: 'genEd',
      type: 'select-any',
      minCredits: 12,
      tag: 'humanities',
      description: 'Arts, literature, and philosophy',
      icon: '🎨',
    },
    {
      id: 'genEd-social',
      label: 'Social Sciences',
      category: 'genEd',
      type: 'select-any',
      minCredits: 9,
      tag: 'social',
      description: 'Psychology, sociology, economics',
      icon: '👥',
    },
    {
      id: 'genEd-communication',
      label: 'Communication',
      category: 'genEd',
      type: 'all-required',
      courseIds: ['ENG101', 'ENG102', 'SPCH101'],
      description: 'Written and oral communication',
      icon: '💬',
    },
    {
      id: 'elective-upper',
      label: 'Upper-Level Electives',
      category: 'elective',
      type: 'select-any',
      minCredits: 12,
      tag: 'upper-div',
      description: '300/400 level courses',
      icon: '🎓',
    },
    {
      id: 'elective-free',
      label: 'Free Electives',
      category: 'elective',
      type: 'select-any',
      minCredits: 6,
      tag: 'free',
      description: 'Any approved courses',
      icon: '✨',
    },
    {
      id: 'capstone',
      label: 'Capstone Project',
      category: 'capstone',
      type: 'all-required',
      courseIds: ['CS497', 'CS498']
    },
    
    // Electives
    {
      id: 'upper-electives',
      label: 'Upper Division Electives',
      category: 'elective',
      type: 'select-any',
      minCredits: 21,
      tag: 'elective'
    }
  ]
};

interface EduTreeV4CanvasProps {
  nodes: PlanNode[];
  edges: PlanEdge[];
  overlays: OverlayState;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  [NodeType.Year]: SpineNode,
  [NodeType.Course]: CourseNode,
  [NodeType.External]: ExternalNode,
  [NodeType.Requirement]: CourseNode,
  [NodeType.Bundle]: CourseNode,
  ghost: GhostCourseNode,
  moduleBundle: ModuleBundleNode,
};

const edgeTypes = {
  transfer: TransferEdge,
  compare: CompareEdge,
};

function CanvasInner({ nodes: initialNodes, edges: initialEdges, overlays, onNodeClick }: EduTreeV4CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [planNodes, setPlanNodes] = useState<PlanNode[]>(initialNodes);
  const [selectedSubReq, setSelectedSubReq] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const { fitView } = useReactFlow();
  
  // Policy engine
  const policyEngine = useMemo(() => new CreditPolicyEngine(DEFAULT_FL_POLICY, 'ucf'), []);

  // Validate degree requirements
  const validation = useMemo(() => 
    validateDegree(planNodes, CS_DEGREE_REQUIREMENTS),
    [planNodes]
  );
  
  // Calculate compliance metrics
  const complianceMetrics = useMemo(() => 
    policyEngine.calculateComplianceScore(planNodes),
    [planNodes, policyEngine]
  );

  // Handle course selection from marketplace
  const handleCourseSelect = useCallback((missingCourseId: string, selectedCourse: MarketplaceCourse) => {
    console.log('[V4 Canvas] Course selected:', { missingCourseId, selectedCourse });
    
    // Create new course node from marketplace selection
    const newNode: PlanNode = {
      id: `${missingCourseId}_marketplace_${Date.now()}`,
      type: NodeType.Course,
      position: { x: 0, y: 0 }, // Layout engine will position
      data: {
        label: missingCourseId,
        credits: 3, // Default, could be extracted from course data
        status: 'planned',
        source: 'other',
        category: 'coreCS', // Match the sub-requirement category
        moduleId: selectedSubReq || undefined,
        selectedProviderId: selectedCourse.id,
        providerId: selectedCourse.platform,
        skillTags: selectedCourse.skill_tags || [],
        difficulty: selectedCourse.difficulty as any,
        estimatedHours: selectedCourse.duration_hours,
      }
    };

    // Validate policy before adding
    const policyStatus = policyEngine.validateCourseSelection(newNode, planNodes);
    
    // Add policy status to node data
    newNode.data.policyStatus = {
      transferable: policyStatus.transferable,
      accredited: policyStatus.accredited,
      articulated: policyStatus.articulated,
      articulationId: policyStatus.articulationId,
    };

    // Add to plan nodes
    setPlanNodes(prev => [...prev, newNode]);
    
    // Close panel
    setSelectedSubReq(null);
  }, [selectedSubReq, planNodes, policyEngine]);

  // Find sub-requirement and its validation status
  const selectedSubReqData = useMemo(() => {
    if (!selectedSubReq) return null;
    const subReq = CS_DEGREE_REQUIREMENTS.subRequirements?.find(sr => sr.id === selectedSubReq);
    const subReqValidation = validation.bySubRequirement?.find(srv => srv.subReqId === selectedSubReq);
    return subReq && subReqValidation ? { subReq, validation: subReqValidation } : null;
  }, [selectedSubReq, validation]);

  // Apply layout when plan nodes change
  useEffect(() => {
    async function applyLayout() {
      console.log('[V4 Canvas] Applying Hybrid layout...');
      // First apply layout, then enrich year nodes with summaries
      const positioned = hybridSpineLayout(planNodes);
      const enriched = enrichYearNodesWithSummaries(positioned);
      
      // Convert to React Flow format
    const reactFlowNodes: Node[] = enriched.map(node => {
      const isGhostNode = node.className?.includes('ghost-node');
      const nodeType = isGhostNode ? 'ghost' : node.type;
      
      // ✅ Pass onClick to ALL course-like nodes (Course, Requirement, Bundle)
      const shouldHaveClick = [NodeType.Course, NodeType.Requirement, NodeType.Bundle].includes(node.type as NodeType);
      
      return {
        id: node.id,
        type: nodeType,
        position: node.position,
        data: { 
          ...node.data,
          onClick: shouldHaveClick && onNodeClick ? () => {
            console.log('[V4 Canvas] Click handler for:', node.id);
            onNodeClick(node.id);
          } : undefined,
          type: nodeType, // CRITICAL: Pass type to data for CSS [data-type] selector
        },
        draggable: false,
        hidden: isGhostNode && !overlays.compare,
      };
    });

      // Debug: Check for overlaps with variable node dimensions
      const checkCollisions = (nodes: Node[]) => {
        const overlaps: Array<{a: string, b: string}> = [];
        
        const getNodeDimensions = (node: Node) => {
          const isGhost = node.type === 'ghost';
          const isYear = node.type === NodeType.Year;
          
          return {
            width: isYear ? 180 : (isGhost ? 200 : 360),
            height: isYear ? 80 : 180,  // All non-year nodes same height
          };
        };
        
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            
            const aDim = getNodeDimensions(a);
            const bDim = getNodeDimensions(b);
            
            const aBox = {
              x1: a.position.x,
              x2: a.position.x + aDim.width,
              y1: a.position.y,
              y2: a.position.y + aDim.height,
            };
            
            const bBox = {
              x1: b.position.x,
              x2: b.position.x + bDim.width,
              y1: b.position.y,
              y2: b.position.y + bDim.height,
            };
            
            const xOverlap = aBox.x1 < bBox.x2 && aBox.x2 > bBox.x1;
            const yOverlap = aBox.y1 < bBox.y2 && aBox.y2 > bBox.y1;
            
            if (xOverlap && yOverlap) {
              overlaps.push({ a: a.id, b: b.id });
            }
          }
        }
        
        if (overlaps.length > 0) {
          console.error('[V4 Canvas] ❌ CRITICAL: Layout has overlaps!', overlaps);
        } else {
          console.log('[V4 Canvas] ✅ No overlaps detected');
        }
        
        return overlaps;
      };

      checkCollisions(reactFlowNodes);

      setLayoutedNodes(reactFlowNodes);
      setNodes(reactFlowNodes);
      
      console.log('[V4 Canvas] Layout complete, fitted view');
      
      // Fit view after layout
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    }

    applyLayout();
  }, [planNodes, initialEdges, fitView, onNodeClick, overlays.compare]);

  // Manual ghost node positioning when Compare overlay is active
  useEffect(() => {
    if (layoutedNodes.length === 0) return;
    
    const updatedNodes = layoutedNodes.map(node => {
      const isGhost = node.type === 'ghost';
      if (!isGhost) return node;
      
      // Find the source node this ghost replaces
      const alternativeFor = node.data.alternativeFor;
      if (!alternativeFor) {
        console.warn(`[V4 Canvas] ⚠️ Ghost node ${node.id} missing alternativeFor`);
        return node;
      }
      
      const sourceNode = layoutedNodes.find(n => n.data.label === alternativeFor);
      if (!sourceNode) {
        console.warn(`[V4 Canvas] ⚠️ Ghost node ${node.id} cannot find source "${alternativeFor}"`);
        return node;
      }
      
      console.log(`[V4 Canvas] 👻 Positioning ghost ${node.id}:`, {
        source: sourceNode.id,
        sourcePos: sourceNode.position,
        ghostPos: { x: sourceNode.position.x, y: sourceNode.position.y + 240 },
        offset: 240
      });
      
      // Position ghost node in the same column as source, offset below by 240px
      return {
        ...node,
        position: {
          x: sourceNode.position.x,
          y: sourceNode.position.y + 240,  // 180px node height + 60px V_GAP = 240px
        },
        hidden: !overlays.compare, // Show when compare is active, hide otherwise
      };
    });
    
    setNodes(updatedNodes);
  }, [overlays.compare, layoutedNodes]);

  // Update edge visibility based on overlays
  useEffect(() => {
    const reactFlowEdges: Edge[] = initialEdges.map(edge => {
      const isEquivEdge = edge.type === EdgeType.Equivalency;
      const isCompareEdge = edge.className?.includes('compare-edge');
      
      // Determine visibility
      const shouldHideTransfer = isEquivEdge && !isCompareEdge && !overlays.transfer;
      const shouldHideCompare = isCompareEdge && !overlays.compare;
      const shouldHide = shouldHideTransfer || shouldHideCompare;

      // Determine edge type
      let edgeType = 'default';
      if (isEquivEdge && !isCompareEdge && overlays.transfer) {
        edgeType = 'transfer';
      } else if (isCompareEdge && overlays.compare) {
        edgeType = 'compare';
      }

      // Determine label
      let label = edge.label;
      if (isEquivEdge && !isCompareEdge) {
        label = 'Transfer: CLEP Exam';
      } else if (isCompareEdge) {
        label = 'Alternative';
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edgeType,
        animated: edge.animated,
        label,
        labelStyle: (isEquivEdge || isCompareEdge) ? { 
          fontSize: 11, 
          fill: 'hsl(var(--foreground))',
          fontWeight: 600 
        } : undefined,
        data: isEquivEdge && !isCompareEdge ? {
          policyText: "Transfer Credit: CLEP Calculus → MATH 151\nPolicy: Max 60 transfer credits. CLEP requires score ≥ 50.\nResidency: Must complete ≥30 credits in residence."
        } : isCompareEdge ? {
          comparisonText: "Plan B Alternative: Lighter prerequisites\nSaves 1 year completion time"
        } : undefined,
        className: `
          ${edge.type === EdgeType.Sequence ? 'spine-edge' : ''}
          ${edge.type === EdgeType.Prerequisite ? 'prereq-edge' : ''}
          ${edge.type === EdgeType.Equivalency && !isCompareEdge ? 'equiv-edge' : ''}
          ${isCompareEdge ? 'compare-edge' : ''}
          ${edge.type === EdgeType.Fulfills ? 'fulfill-edge' : ''}
          ${shouldHide ? 'hidden' : ''}
        `.trim(),
        hidden: shouldHide,
      };
    });

    setEdges(reactFlowEdges);
  }, [initialEdges, overlays]);

  // Group courses by module for visual grouping
  const coursesByModule = useMemo(() => groupCoursesByModule(planNodes), [planNodes]);
  
  // Calculate all module card positions at once
  const moduleCardPositions = useMemo(() => 
    calculateModuleCardPositions(coursesByModule, CS_DEGREE_REQUIREMENTS.subRequirements || []),
    [coursesByModule]
  );
  
  // Toggle module collapse
  const toggleModule = useCallback((moduleId: string) => {
    setCollapsedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // Bulk expand/collapse handlers
  const handleExpandAll = useCallback(() => {
    setCollapsedModules(new Set());
    localStorage.setItem('edutree_collapsed_modules', JSON.stringify([]));
  }, []);

  const handleCollapseAll = useCallback(() => {
    const allModuleIds = CS_DEGREE_REQUIREMENTS.subRequirements?.map(sr => sr.id) || [];
    setCollapsedModules(new Set(allModuleIds));
    localStorage.setItem('edutree_collapsed_modules', JSON.stringify(allModuleIds));
  }, []);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('edutree_collapsed_modules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCollapsedModules(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse collapsed modules:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('edutree_collapsed_modules', JSON.stringify(Array.from(collapsedModules)));
  }, [collapsedModules]);

  return (
    <div className="relative w-full h-full">
      {/* Compliance Score Panel with Export */}
      <div className="absolute top-4 left-4 z-10 w-72 space-y-2">
        <ComplianceScorePanel metrics={complianceMetrics} />
        <ExportPlanButton
          planNodes={planNodes}
          validation={validation}
          complianceMetrics={complianceMetrics}
          requirements={CS_DEGREE_REQUIREMENTS}
        />
      </div>
      
      {/* Validation Panel with Share */}
      <div className="absolute top-4 right-4 z-10 w-80 space-y-2">
        <DegreeValidationPanel 
          validation={validation}
          onBrowseModule={(subReqId) => setSelectedSubReq(subReqId)}
        />
        <SharePlanDialog planNodes={planNodes} />
      </div>

      {/* Module Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <ModuleToolbar
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
        />
      </div>

      {/* Badge Legend */}
      <div className="absolute bottom-4 right-4 z-10 w-80">
        <BadgeLegend />
      </div>
      
      {/* Module Cards Overlay */}
      {CS_DEGREE_REQUIREMENTS.subRequirements?.map((subReq) => {
        const moduleValidation = validation.bySubRequirement?.find(v => v.subReqId === subReq.id);
        const moduleCourses = coursesByModule.get(subReq.id) || [];
        
        if (!moduleValidation || moduleCourses.length === 0) return null;
        
        // Get position from pre-calculated positions map
        const position = moduleCardPositions.get(subReq.id) || { x: 0, y: 0 };
        
        return (
          <div
            key={`module-${subReq.id}`}
            className="absolute pointer-events-auto transition-all duration-200"
            style={{
              left: position.x,
              top: position.y,
              zIndex: 20,
            }}
          >
            <ModuleCard
              module={subReq}
              validation={moduleValidation}
              isCollapsed={collapsedModules.has(subReq.id)}
              onToggle={() => toggleModule(subReq.id)}
              onBrowseOptions={() => setSelectedSubReq(subReq.id)}
            />
          </div>
        );
      })}
      
      {/* Course Selection Panel */}
      <CourseSelectionPanel
        subRequirement={selectedSubReqData?.subReq || null}
        validation={selectedSubReqData?.validation || null}
        currentPlan={planNodes}
        isOpen={!!selectedSubReq}
        onClose={() => setSelectedSubReq(null)}
        onSelectCourse={handleCourseSelect}
      />
      
      {/* Semester column separators */}
      <div className="semester-separators">
        {nodes
          .filter(n => n.type === NodeType.Year)
          .map(yearNode => {
            const baseX = yearNode.position.x;
            const BASE_NODE_WIDTH = 360;
            const H_GAP = 120;
            const COLUMNS = 2;
            const gridWidth = COLUMNS * BASE_NODE_WIDTH + (COLUMNS - 1) * H_GAP;
            const gridStartX = baseX - gridWidth / 2;
            const separatorX = gridStartX + BASE_NODE_WIDTH + H_GAP / 2;
            
            return (
              <div
                key={`separator-${yearNode.id}`}
                className="semester-separator"
                style={{
                  position: 'absolute',
                  left: separatorX,
                  top: 60,
                  width: '1px',
                  height: '2000px',
                  background: 'linear-gradient(to bottom, transparent, hsl(var(--border) / 0.2) 100px, hsl(var(--border) / 0.2) 90%, transparent)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            );
          })}
      </div>
      
      <ReactFlow
        nodes={nodes.map(node => {
          // Hide courses when their module is collapsed
          const moduleId = node.data?.moduleId as string | undefined;
          if (moduleId && collapsedModules.has(moduleId)) {
            return { ...node, hidden: true };
          }
          return node;
        })}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'default' }}
        onNodeClick={(event, node) => {
          // Trigger for all nodes that render as CourseNode component
          const courseNodeTypes = [NodeType.Course, NodeType.Requirement, NodeType.Bundle];
          const nodeData = node.data as any;
          
          if (courseNodeTypes.includes(node.type as NodeType) && typeof nodeData?.onClick === 'function') {
            console.log('[V4 Canvas] Node clicked:', node.id, node.type);
            nodeData.onClick();
          }
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function EduTreeV4Canvas(props: EduTreeV4CanvasProps) {
  return <CanvasInner {...props} />;
}
