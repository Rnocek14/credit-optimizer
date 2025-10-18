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
import { hybridSpineLayout, moduleCardLayout, enrichYearNodesWithSummaries, groupCoursesByModule } from '../engine/layoutEngine';
import { validateDegree } from '../engine/degreeValidator';
import { CS_DEGREE_REQUIREMENTS_V2 } from '../data/requirementsV2';
import { filterVisibleNodes, getCollapsedYearSummary, filterVisibleEdges } from '../engine/collapseEngine';
import { flattenRequirements, findRequirementById } from '../types/requirementsHierarchy';
import { annotateCourseModules } from '../seed/migrateSeedToHierarchy';
import { DegreeValidationPanel } from './DegreeValidationPanel';
import { ModuleDetailPanel } from './panels/ModuleDetailPanel';
import { ComplianceScorePanel } from './ComplianceScorePanel';
import { CreditPolicyEngine, DEFAULT_FL_POLICY } from '../engine/CreditPolicyEngine';
import { SpineNode } from './nodes/SpineNode';
import { CourseNode } from './nodes/CourseNode';
import { GhostCourseNode } from './nodes/GhostCourseNode';
import { ExternalNode } from './nodes/ExternalNode';
import { ModuleCard } from './nodes/ModuleCard';
import { ModuleBundleNode } from './nodes/ModuleBundleNode';
import { ModuleGroupNode } from './nodes/ModuleGroupNode';
import { PlaceholderCourseNode } from './nodes/PlaceholderCourseNode';
import { TransferEdge } from './edges/TransferEdge';
import { CompareEdge } from './edges/CompareEdge';
import { ExportPlanButton } from './ExportPlanButton';
import { SharePlanDialog } from './SharePlanDialog';
import { BadgeLegend } from './BadgeLegend';
import { MarketplaceCourse } from '@/hooks/useCourseMarketplace';
import { toast } from 'sonner';
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
  [NodeType.Placeholder]: PlaceholderCourseNode,
  ghost: GhostCourseNode,
  moduleBundle: ModuleBundleNode,
  moduleGroup: ModuleGroupNode,
};

const edgeTypes = {
  transfer: TransferEdge,
  compare: CompareEdge,
};

function CanvasInner({ nodes: initialNodes, edges: initialEdges, overlays, onNodeClick }: EduTreeV4CanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [selectedSubReq, setSelectedSubReq] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  
  // ✨ Phase 2S: Collapse state management
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [isDegreeCollapsed, setIsDegreeCollapsed] = useState(false);
  
  // Annotate courses with moduleId based on hierarchical requirements
  const annotatedNodes = useMemo(() => 
    annotateCourseModules(initialNodes, CS_DEGREE_REQUIREMENTS_V2.requirements),
    [initialNodes]
  );
  
  const [planNodes, setPlanNodes] = useState<PlanNode[]>(annotatedNodes);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | undefined>(undefined);
  
  // Policy engine
  const policyEngine = useMemo(() => new CreditPolicyEngine(DEFAULT_FL_POLICY, 'ucf'), []);

  // Validate degree requirements (convert hierarchical to flat for validator)
  const validation = useMemo(() => {
    const flatRequirements: DegreeRequirements = {
      totalCredits: CS_DEGREE_REQUIREMENTS_V2.totalCredits,
      residencyMinimum: CS_DEGREE_REQUIREMENTS_V2.residencyMinimum,
      categories: CS_DEGREE_REQUIREMENTS_V2.categories!,
      subRequirements: flattenRequirements(CS_DEGREE_REQUIREMENTS_V2.requirements).map(req => ({
        id: req.id,
        label: req.label,
        category: req.category,
        type: req.type,
        requiredCount: req.requiredCount,
        minCredits: req.minCredits,
        courseIds: req.courseIds,
        tag: req.tag,
        description: req.description,
        icon: req.icon,
      }))
    };
    return validateDegree(planNodes, flatRequirements);
  }, [planNodes]);
  
  // Calculate compliance metrics
  const complianceMetrics = useMemo(() => 
    policyEngine.calculateComplianceScore(planNodes),
    [planNodes, policyEngine]
  );

  // Handle course management from module panel
  const handleAddCourseToModule = useCallback((moduleId: string, course: MarketplaceCourse) => {
    const newNode: PlanNode = {
      id: `${moduleId}_course_${Date.now()}`,
      type: NodeType.Course,
      position: { x: 0, y: 0 }, // Not rendered in tree
      data: {
        label: course.title,
        credits: 3,
        status: 'planned',
        source: 'other',
        moduleId: moduleId,
        providerId: course.platform,
        selectedProviderId: course.id,
        skillTags: course.skill_tags || [],
        difficulty: course.difficulty as any,
        estimatedHours: course.duration_hours,
      }
    };
    
    // Validate policy
    const policyStatus = policyEngine.validateCourseSelection(newNode, planNodes);
    newNode.data.policyStatus = {
      transferable: policyStatus.transferable,
      accredited: policyStatus.accredited,
      articulated: policyStatus.articulated,
      articulationId: policyStatus.articulationId,
    };
    
    setPlanNodes(prev => [...prev, newNode]);
    toast.success('Course added', { description: `Added ${course.title} to your plan` });
  }, [planNodes, policyEngine]);

  const handleRemoveCourse = useCallback((courseId: string) => {
    setPlanNodes(prev => prev.filter(n => n.id !== courseId));
    toast.success('Course removed');
  }, []);

  const handleReplaceCourse = useCallback((oldId: string, newCourse: MarketplaceCourse) => {
    setPlanNodes(prev => prev.map(n => 
      n.id === oldId ? {
        ...n,
        data: {
          ...n.data,
          label: newCourse.title,
          providerId: newCourse.platform,
          selectedProviderId: newCourse.id,
        }
      } : n
    ));
    toast.success('Course replaced');
  }, []);

  // ✨ Phase 2S: Collapse toggle handlers with cascade logic
  const toggleYearCollapse = useCallback((year: number) => {
    setCollapsedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
        // When collapsing year, also collapse all its modules
        const yearModuleIds = planNodes
          .filter(n => n.data.year === year && n.data.moduleId)
          .map(n => n.data.moduleId!)
          .filter((id, idx, arr) => arr.indexOf(id) === idx); // unique
        
        setCollapsedModules(prevMods => {
          const nextMods = new Set(prevMods);
          yearModuleIds.forEach(id => nextMods.add(id));
          return nextMods;
        });
      }
      return next;
    });
  }, [planNodes]);

  const toggleModuleCollapse = useCallback((moduleId: string) => {
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

  const toggleDegreeCollapse = useCallback(() => {
    setIsDegreeCollapsed(prev => {
      const next = !prev;
      if (next) {
        // When collapsing degree, collapse ALL years and modules
        setCollapsedYears(new Set([1, 2, 3, 4]));
        const allModuleIds = planNodes
          .filter(n => n.data.moduleId)
          .map(n => n.data.moduleId!)
          .filter((id, idx, arr) => arr.indexOf(id) === idx);
        setCollapsedModules(new Set(allModuleIds));
      }
      return next;
    });
  }, [planNodes]);

  // Get selected module data for panel
  const selectedModuleData = useMemo(() => {
    if (!selectedModuleId) return null;
    const module = findRequirementById(selectedModuleId, CS_DEGREE_REQUIREMENTS_V2.requirements);
    const moduleValidation = validation.bySubRequirement?.find(srv => srv.subReqId === selectedModuleId);
    
    if (!module) return null;
    
    // Get child sequences if bucket-level
    const sequences = module.level === 'bucket' && module.children 
      ? module.children 
      : [];
    
    // Get current courses for this module (or matching child sequences)
    const currentCourses = planNodes.filter(n => {
      if (n.data.moduleId === selectedModuleId) return true;
      // Also include courses from child sequences
      if (module.level === 'bucket' && module.children) {
        return module.children.some(child => child.id === n.data.moduleId);
      }
      return false;
    });
    
    return {
      module,
      sequences,
      currentCourses,
      validation: moduleValidation,
      yearFilter: selectedYearFilter,
    };
  }, [selectedModuleId, selectedYearFilter, planNodes, validation]);

  // Apply layout when plan nodes change
  useEffect(() => {
    async function applyLayout() {
      console.log('[V4 Canvas] Applying Module Card layout...');
      // Use module card layout (Phase 2I)
      const positioned = moduleCardLayout(
        planNodes, 
        CS_DEGREE_REQUIREMENTS_V2.requirements
      );
      const enriched = enrichYearNodesWithSummaries(positioned);
      
      // ✨ Phase 2T: Apply collapse filtering and add summaries
      const collapseState = { collapsedYears, collapsedModules, isDegreeCollapsed };
      const visibleNodes = filterVisibleNodes(enriched, collapseState);
      
      // Add collapsed summaries to year nodes
      const nodesWithSummaries = visibleNodes.map(node => {
        if (node.type === NodeType.Year) {
          const yearMatch = node.data.label.match(/Year (\d+)/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            if (collapsedYears.has(year)) {
              return {
                ...node,
                data: {
                  ...node.data,
                  collapsedSummary: getCollapsedYearSummary(year, enriched),
                },
              };
            }
          }
        }
        return node;
      });
      
      // Convert to React Flow format
    const reactFlowNodes: Node[] = nodesWithSummaries.map(node => {
      const isGhostNode = node.className?.includes('ghost-node');
      const isModuleGroup = node.type === NodeType.ModuleGroup || node.data.type === 'moduleGroup';
      const isYearNode = node.type === NodeType.Year;
      const nodeType = isGhostNode ? 'ghost' : (isModuleGroup ? 'moduleGroup' : node.type);
      
      // ✨ Phase 2T: For year nodes, inject collapse state and handler
      if (isYearNode) {
        const yearMatch = node.data.label.match(/Year (\d+)/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        const isCollapsed = year ? collapsedYears.has(year) : false;
        
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            onToggleCollapse: year ? () => toggleYearCollapse(year) : undefined,
            type: node.type,
          },
          draggable: false,
          isCollapsed, // Pass as node prop for SpineNode component
        };
      }
      
      // For module group nodes, inject click handler
      if (isModuleGroup) {
        const moduleId = node.data.moduleId;
        const yearFilter = node.data.yearFilter; // Extract year filter from card
        
        return {
          id: node.id,
          type: 'moduleGroup',
          position: node.position,
          data: {
            ...node.data,
            onClick: () => {
              setSelectedModuleId(moduleId);
              setSelectedYearFilter(yearFilter);
            },
          },
          draggable: false,
        style: {
          width: node.style?.width || 440,
          height: node.style?.height || 260,
          zIndex: 10 + Math.floor(node.position.y / 100), // Higher Y = higher z-index
        },
        };
      }
      
      // ✅ Pass onClick to ALL course-like nodes (Course, Requirement, Bundle, Placeholder)
      const shouldHaveClick = [NodeType.Course, NodeType.Requirement, NodeType.Bundle, NodeType.Placeholder].includes(node.type as NodeType);
      
      // For placeholder nodes, inject onBrowseOptions handler
      const dataWithHandlers = node.type === NodeType.Placeholder ? {
        ...node.data,
        onBrowseOptions: () => {
          console.log('[V4 Canvas] Browse options for placeholder:', node.id);
          if (node.data.moduleId) {
            setSelectedSubReq(node.data.moduleId);
          }
        },
      } : node.data;
      
      return {
        id: node.id,
        type: nodeType,
        position: node.position,
        parentId: node.parentNode, // Pass parent for hierarchical nesting (ReactFlow uses parentId)
        extent: node.extent,        // Constrain to parent bounds
        data: { 
          ...dataWithHandlers,
          onClick: shouldHaveClick && onNodeClick ? () => {
            console.log('[V4 Canvas] Click handler for:', node.id);
            onNodeClick(node.id);
          } : undefined,
          type: nodeType, // CRITICAL: Pass type to data for CSS [data-type] selector
        },
        draggable: false,
        hidden: isGhostNode && !overlays.compare,
        style: node.parentNode ? { zIndex: 1 } : undefined, // Child nodes above parent
      };
    }).filter(n => 
      // ONLY render Module and Year nodes (no course nodes)
      n.type === 'moduleGroup' || n.type === NodeType.Year
    );

      // Debug: Check for overlaps with variable node dimensions
      const checkCollisions = (nodes: Node[]) => {
        const overlaps: Array<{a: string, b: string}> = [];
        
        const getNodeDimensions = (node: Node) => {
          const isGhost = node.type === 'ghost';
          const isYear = node.type === NodeType.Year;
          
          return {
            width: isYear ? 180 : (isGhost ? 200 : 440),  // ✅ Match CSS module card width
            height: isYear ? 120 : 260,  // ✅ Match SpineNode min-h-[120px]
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
  }, [planNodes, initialEdges, fitView, onNodeClick, overlays.compare, collapsedYears, collapsedModules, isDegreeCollapsed, toggleYearCollapse]);

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

  // Update edge visibility based on overlays and collapse state
  useEffect(() => {
    // ✨ Phase 2T: Filter edges based on visible nodes
    const visibleNodeIds = new Set(nodes.map(n => n.id));
    
    const reactFlowEdges: Edge[] = initialEdges.map(edge => {
      const isEquivEdge = edge.type === EdgeType.Equivalency;
      const isCompareEdge = edge.className?.includes('compare-edge');
      
      // ✨ Phase 2T: Hide edges if either endpoint is hidden
      const sourceVisible = visibleNodeIds.has(edge.source);
      const targetVisible = visibleNodeIds.has(edge.target);
      const endpointHidden = !sourceVisible || !targetVisible;
      
      // Determine visibility
      const shouldHideTransfer = isEquivEdge && !isCompareEdge && !overlays.transfer;
      const shouldHideCompare = isCompareEdge && !overlays.compare;
      const shouldHide = shouldHideTransfer || shouldHideCompare || endpointHidden;

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
  }, [initialEdges, overlays, nodes]);


  return (
    <div className="relative w-full h-full">
      {/* Compliance Score Panel with Export */}
      <div className="absolute top-4 left-4 z-10 w-72 space-y-2">
        <ComplianceScorePanel metrics={complianceMetrics} />
        <ExportPlanButton
          planNodes={planNodes}
          validation={validation}
          complianceMetrics={complianceMetrics}
          requirements={{
            totalCredits: CS_DEGREE_REQUIREMENTS_V2.totalCredits,
            residencyMinimum: CS_DEGREE_REQUIREMENTS_V2.residencyMinimum,
            categories: CS_DEGREE_REQUIREMENTS_V2.categories!,
            subRequirements: flattenRequirements(CS_DEGREE_REQUIREMENTS_V2.requirements).map(req => ({
              id: req.id,
              label: req.label,
              category: req.category,
              type: req.type,
              requiredCount: req.requiredCount,
              minCredits: req.minCredits,
              courseIds: req.courseIds,
              tag: req.tag,
              description: req.description,
              icon: req.icon,
            }))
          }}
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

      {/* Badge Legend */}
      <div className="absolute bottom-4 right-4 z-10 w-80">
        <BadgeLegend />
      </div>
      
      {/* Module Detail Panel */}
      {selectedModuleData && (
        <ModuleDetailPanel
          module={selectedModuleData.module}
          sequences={selectedModuleData.sequences}
          currentCourses={selectedModuleData.currentCourses}
          validation={selectedModuleData.validation}
          isOpen={!!selectedModuleId}
          onClose={() => {
            setSelectedModuleId(null);
            setSelectedYearFilter(undefined);
          }}
          onAddCourse={handleAddCourseToModule}
          onRemoveCourse={handleRemoveCourse}
          onReplaceCourse={handleReplaceCourse}
          yearFilter={selectedModuleData.yearFilter}
        />
      )}
      
      
      <ReactFlow
        nodes={nodes}
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
