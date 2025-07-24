import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

interface TreeNode {
  id: string;
  type: string;
  data: any;
  children: TreeNode[];
  parent?: TreeNode;
  level: number;
  branch: number;
}

interface BranchLayout {
  rootX: number;
  rootY: number;
  levelHeight: number;
  branchSpacing: number;
  nodeSpacing: number;
}

export const useTreeBranchEngine = () => {
  const {
    careerSteps,
    skills,
    courses,
    projects,
    certifications,
    stepSkillMappings,
    selectedCareerPath,
    careerPaths,
    displayControls,
    userProgress
  } = useSkillTree();

  // Tree structure calculation
  const treeStructure = useMemo(() => {
    if (!selectedCareerPath || !careerSteps.length) return null;

    // Build career goal as root
    const selectedPath = careerPaths.find(p => p.id === selectedCareerPath);
    if (!selectedPath) return null;

    const rootNode: TreeNode = {
      id: `job-${selectedPath.id}`,
      type: 'job',
      data: {
        title: selectedPath.title,
        description: selectedPath.description,
        level: 'Goal',
        isGoal: true,
      },
      children: [],
      level: 0,
      branch: 0
    };

    // Build prerequisite chains for career steps
    const stepMap = new Map<string, TreeNode>();
    const sortedSteps = [...careerSteps].sort((a, b) => (a.level || 1) - (b.level || 1));

    // Create step nodes
    sortedSteps.forEach((step, index) => {
      const stepNode: TreeNode = {
        id: step.id,
        type: 'careerStep',
        data: {
          ...step,
          skills: stepSkillMappings
            .filter(m => m.step_id === step.id)
            .map(m => skills.find(s => s.id === m.skill_id))
            .filter(Boolean)
        },
        children: [],
        level: step.level || 1,
        branch: index
      };
      stepMap.set(step.id, stepNode);
    });

    // Build prerequisite relationships
    sortedSteps.forEach(step => {
      const stepNode = stepMap.get(step.id);
      if (!stepNode) return;

      if (!step.prerequisites?.length) {
        // No prerequisites - connect to root
        rootNode.children.push(stepNode);
        stepNode.parent = rootNode;
      } else {
        // Has prerequisites - connect to the first prerequisite
        const prereqNode = stepMap.get(step.prerequisites[0]);
        if (prereqNode) {
          prereqNode.children.push(stepNode);
          stepNode.parent = prereqNode;
        } else {
          // Fallback to root if prerequisite not found
          rootNode.children.push(stepNode);
          stepNode.parent = rootNode;
        }
      }
    });

    // Add skill branches to each step
    stepMap.forEach(stepNode => {
      const stepSkills = stepSkillMappings
        .filter(m => m.step_id === stepNode.id)
        .map(m => ({
          mapping: m,
          skill: skills.find(s => s.id === m.skill_id)
        }))
        .filter(item => item.skill)
        .sort((a, b) => (b.mapping.importance_score || 0) - (a.mapping.importance_score || 0));

      stepSkills.forEach((item, index) => {
        const skillNode: TreeNode = {
          id: `skill-${item.skill!.id}`,
          type: 'skill',
          data: {
            ...item.skill,
            importance: item.mapping.importance_score,
            stepId: stepNode.id,
            category: item.skill!.category
          },
          children: [],
          parent: stepNode,
          level: stepNode.level + 1,
          branch: index
        };
        stepNode.children.push(skillNode);

        // Add supporting content to skills
        if (displayControls.showCourses) {
          const relatedCourses = courses.filter(course => 
            course.skill_tags?.some(tag => 
              tag.toLowerCase().includes(item.skill!.name.toLowerCase()) ||
              item.skill!.name.toLowerCase().includes(tag.toLowerCase())
            )
          );

          relatedCourses.slice(0, 2).forEach((course, courseIndex) => {
            const courseNode: TreeNode = {
              id: `course-${course.id}`,
              type: 'course',
              data: course,
              children: [],
              parent: skillNode,
              level: skillNode.level + 1,
              branch: courseIndex
            };
            skillNode.children.push(courseNode);
          });
        }

        if (displayControls.showProjects) {
          const relatedProjects = projects.filter(project =>
            project.skills_demonstrated?.some(skill =>
              skill.toLowerCase().includes(item.skill!.name.toLowerCase())
            )
          );

          relatedProjects.slice(0, 1).forEach((project, projectIndex) => {
            const projectNode: TreeNode = {
              id: `project-${project.id}`,
              type: 'project',  
              data: project,
              children: [],
              parent: skillNode,
              level: skillNode.level + 1,
              branch: projectIndex + 2 // Offset from courses
            };
            skillNode.children.push(projectNode);
          });
        }
      });
    });

    return rootNode;
  }, [
    selectedCareerPath,
    careerSteps,
    skills,
    courses,
    projects,
    stepSkillMappings,
    careerPaths,
    displayControls.showCourses,
    displayControls.showProjects
  ]);

  // Calculate positions using recursive tree layout
  const calculateTreePositions = useCallback((
    rootNode: TreeNode,
    layout: BranchLayout
  ): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const positionMap = new Map<string, { x: number; y: number }>();

    const calculateNodePosition = (
      node: TreeNode,
      parentX: number = layout.rootX,
      parentY: number = layout.rootY,
      siblingIndex: number = 0,
      totalSiblings: number = 1
    ): { x: number; y: number } => {
      let x: number;
      let y: number;

      if (node.level === 0) {
        // Root node - center top
        x = layout.rootX;
        y = layout.rootY;
      } else {
        // Calculate Y position based on level
        y = parentY + layout.levelHeight;

        // Calculate X position based on branching
        if (totalSiblings === 1) {
          x = parentX;
        } else {
          const totalWidth = (totalSiblings - 1) * layout.branchSpacing;
          const startX = parentX - totalWidth / 2;
          x = startX + siblingIndex * layout.branchSpacing;
        }
      }

      positionMap.set(node.id, { x, y });
      return { x, y };
    };

    const traverseTree = (node: TreeNode, parentPos?: { x: number; y: number }) => {
      const siblings = node.parent?.children || [node];
      const siblingIndex = siblings.indexOf(node);
      const totalSiblings = siblings.length;

      const position = calculateNodePosition(
        node,
        parentPos?.x || layout.rootX,
        parentPos?.y || layout.rootY,
        siblingIndex,
        totalSiblings
      );

      // Determine completion status
      const progress = userProgress?.find(p => 
        (p.skillId === node.id.replace('skill-', '')) ||
        (p.stepId === node.id) ||
        (p.courseId === node.id.replace('course-', ''))
      );
      
      const isCompleted = progress?.status === 'completed';
      const isInProgress = progress?.status === 'in_progress';

      // Create node
      nodes.push({
        id: node.id,
        type: node.type,
        position,
        data: {
          ...node.data,
          isCompleted,
          isInProgress,
          isLocked: !isCompleted && !isInProgress && node.level > 1,
          level: node.level,
          branch: node.branch,
          hasChildren: node.children.length > 0,
          isCollapsed: false, // Will be managed by state later
        }
      });

      // Create edge to parent
      if (node.parent && parentPos) {
        const edgeStyle = getEdgeStyle(node.type, isCompleted);
        edges.push({
          id: `edge-${node.parent.id}-${node.id}`,
          source: node.parent.id,
          target: node.id,
          type: 'smoothstep',
          style: edgeStyle,
          animated: isInProgress,
          data: {
            relationship: getRelationshipType(node.parent.type, node.type)
          }
        });
      }

      // Recursively process children
      node.children.forEach(child => {
        traverseTree(child, position);
      });
    };

    traverseTree(rootNode);
    return { nodes, edges };
  }, [userProgress]);

  // Helper functions for edge styling
  const getEdgeStyle = (nodeType: string, isCompleted: boolean) => {
    const baseStyle = {
      strokeWidth: 2,
      stroke: isCompleted ? 'hsl(var(--green-500))' : 'hsl(var(--muted-foreground))',
    };

    switch (nodeType) {
      case 'skill':
        return { ...baseStyle, strokeDasharray: isCompleted ? '0' : '5,5' };
      case 'course':
        return { ...baseStyle, stroke: 'hsl(var(--blue-500))' };
      case 'project':
        return { ...baseStyle, stroke: 'hsl(var(--purple-500))' };
      default:
        return baseStyle;
    }
  };

  const getRelationshipType = (parentType: string, childType: string) => {
    if (parentType === 'job' && childType === 'careerStep') return 'requires';
    if (parentType === 'careerStep' && childType === 'skill') return 'develops';
    if (parentType === 'skill' && childType === 'course') return 'learned_through';
    if (parentType === 'skill' && childType === 'project') return 'applied_in';
    return 'connects_to';
  };

  // Main generation function
  const generateBranchedTree = useCallback(() => {
    if (!treeStructure) {
      return { nodes: [], edges: [] };
    }

    const layout: BranchLayout = {
      rootX: 600, // Center of viewport
      rootY: 100, // Top margin
      levelHeight: 200, // Vertical space between levels
      branchSpacing: 250, // Horizontal space between siblings
      nodeSpacing: 50 // Minimum space between nodes
    };

    return calculateTreePositions(treeStructure, layout);
  }, [treeStructure, calculateTreePositions]);

  return {
    generateBranchedTree,
    treeStructure
  };
};