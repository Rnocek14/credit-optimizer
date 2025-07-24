import { useMemo, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSkillTree } from '@/contexts/SkillTreeContext';

interface SkillCluster {
  id: string;
  category: string;
  skills: any[];
  center: { x: number; y: number };
  radius: number;
  color: string;
  level: number;
  isExpanded: boolean;
}

interface ClusterLayout {
  clusters: SkillCluster[];
  centerX: number;
  centerY: number;
  clusterSpacing: number;
}

export const useSmartClusterEngine = () => {
  const {
    skills,
    careerSteps,
    stepSkillMappings,
    displayControls,
    userProgress
  } = useSkillTree();

  // Define category clusters with visual properties
  const categoryConfig = useMemo(() => ({
    'Programming': { 
      color: 'hsl(var(--blue-500))', 
      priority: 1,
      icon: '💻',
      description: 'Core programming languages and concepts'
    },
    'Framework': { 
      color: 'hsl(var(--green-500))', 
      priority: 2,
      icon: '⚡',
      description: 'Development frameworks and libraries'
    },
    'Tools': { 
      color: 'hsl(var(--purple-500))', 
      priority: 3,
      icon: '🔧',
      description: 'Development tools and utilities'
    },
    'Database': { 
      color: 'hsl(var(--orange-500))', 
      priority: 3,
      icon: '🗄️',
      description: 'Data storage and management'
    },
    'Cloud': { 
      color: 'hsl(var(--cyan-500))', 
      priority: 4,
      icon: '☁️',
      description: 'Cloud platforms and services'
    },
    'DevOps': { 
      color: 'hsl(var(--red-500))', 
      priority: 4,
      icon: '🚀',
      description: 'Deployment and operations'
    },
    'Soft Skills': { 
      color: 'hsl(var(--yellow-500))', 
      priority: 2,
      icon: '🤝',
      description: 'Communication and collaboration'
    },
    'Leadership': { 
      color: 'hsl(var(--pink-500))', 
      priority: 5,
      icon: '👑',
      description: 'Management and leadership skills'
    }
  }), []);

  // Generate skill clusters based on categories and career step importance
  const generateClusters = useCallback((): ClusterLayout => {
    const clusterMap = new Map<string, SkillCluster>();
    
    // Group skills by category
    const skillsByCategory = skills.reduce((acc, skill) => {
      const category = skill.category || 'Programming';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate cluster importance based on career step mappings
    const categoryImportance = new Map<string, number>();
    stepSkillMappings.forEach(mapping => {
      const skill = skills.find(s => s.id === mapping.skill_id);
      if (skill) {
        const category = skill.category || 'Programming';
        const currentImportance = categoryImportance.get(category) || 0;
        categoryImportance.set(category, currentImportance + (mapping.importance_score || 1));
      }
    });

    // Create clusters
    Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
      const config = categoryConfig[category];
      const importance = categoryImportance.get(category) || 0;
      const completedSkills = categorySkills.filter(skill => 
        userProgress?.find(p => p.skillId === skill.id)?.status === 'completed'
      ).length;
      
      const completionRate = categorySkills.length > 0 ? completedSkills / categorySkills.length : 0;
      
      clusterMap.set(category, {
        id: `cluster-${category}`,
        category,
        skills: categorySkills,
        center: { x: 0, y: 0 }, // Will be calculated later
        radius: Math.max(60, Math.min(120, categorySkills.length * 15 + importance * 5)),
        color: config?.color || 'hsl(var(--muted-foreground))',
        level: config?.priority || 3,
        isExpanded: importance > 10 || completionRate > 0.5 // Auto-expand important/progressed clusters
      });
    });

    // Calculate cluster positions using circular layout based on importance
    const clusters = Array.from(clusterMap.values())
      .sort((a, b) => categoryImportance.get(b.category)! - categoryImportance.get(a.category)!);
    
    const centerX = 600;
    const centerY = 400;
    const baseRadius = 200;
    
    clusters.forEach((cluster, index) => {
      if (index === 0) {
        // Most important cluster in center
        cluster.center = { x: centerX, y: centerY };
      } else {
        // Arrange others in concentric circles
        const ring = Math.ceil(index / 6); // 6 clusters per ring
        const angleStep = (2 * Math.PI) / Math.min(6, clusters.length - (ring - 1) * 6);
        const angle = ((index - 1) % 6) * angleStep;
        const radius = baseRadius + ring * 150;
        
        cluster.center = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      }
    });

    return {
      clusters,
      centerX,
      centerY,
      clusterSpacing: 100
    };
  }, [skills, stepSkillMappings, categoryConfig, userProgress]);

  // Convert clusters to React Flow nodes and edges
  const generateClusterNodes = useCallback((layout: ClusterLayout): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    layout.clusters.forEach(cluster => {
      const config = categoryConfig[cluster.category];
      const completedSkills = cluster.skills.filter(skill => 
        userProgress?.find(p => p.skillId === skill.id)?.status === 'completed'
      ).length;
      const completionRate = cluster.skills.length > 0 ? completedSkills / cluster.skills.length : 0;

      // Create cluster summary node
      nodes.push({
        id: cluster.id,
        type: 'cluster',
        position: { 
          x: cluster.center.x - cluster.radius,
          y: cluster.center.y - cluster.radius
        },
        data: {
          category: cluster.category,
          skillCount: cluster.skills.length,
          completedCount: completedSkills,
          completionRate,
          color: cluster.color,
          icon: config?.icon || '📚',
          description: config?.description || 'Skills category',
          isExpanded: cluster.isExpanded,
          skills: cluster.skills,
          radius: cluster.radius,
          level: cluster.level
        },
        style: {
          width: cluster.radius * 2,
          height: cluster.radius * 2,
          border: `3px solid ${cluster.color}`,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${cluster.color}20, ${cluster.color}10)`,
        }
      });

      // Create individual skill nodes if cluster is expanded
      if (cluster.isExpanded && displayControls.showSkills) {
        cluster.skills.forEach((skill, skillIndex) => {
          const skillProgress = userProgress?.find(p => p.skillId === skill.id);
          const isCompleted = skillProgress?.status === 'completed';
          const isInProgress = skillProgress?.status === 'in_progress';

          // Position skills around cluster center
          const angleStep = (2 * Math.PI) / cluster.skills.length;
          const angle = skillIndex * angleStep;
          const distance = cluster.radius + 60;
          
          const skillX = cluster.center.x + Math.cos(angle) * distance;
          const skillY = cluster.center.y + Math.sin(angle) * distance;

          nodes.push({
            id: `skill-${skill.id}`,
            type: 'skill',
            position: { x: skillX - 40, y: skillY - 30 },
            data: {
              ...skill,
              isCompleted,
              isInProgress,
              isLocked: false,
              clusterCategory: cluster.category,
              importance: stepSkillMappings.find(m => m.skill_id === skill.id)?.importance_score || 1,
              estimatedWeeks: skill.difficulty_level <= 2 ? '1-2 weeks' : 
                            skill.difficulty_level <= 4 ? '2-4 weeks' : '4-8 weeks',
              difficultyLevel: skill.difficulty_level <= 2 ? 'beginner' : 
                             skill.difficulty_level <= 4 ? 'intermediate' : 'advanced',
            }
          });

          // Create edge from cluster to skill
          edges.push({
            id: `cluster-edge-${cluster.id}-${skill.id}`,
            source: cluster.id,
            target: `skill-${skill.id}`,
            type: 'straight',
            style: {
              stroke: cluster.color,
              strokeWidth: 2,
              strokeOpacity: 0.6
            },
            data: {
              relationship: 'contains'
            }
          });
        });
      }
    });

    // Create connections between related clusters
    layout.clusters.forEach(cluster => {
      // Find related clusters based on skill prerequisites
      const relatedClusters = new Set<string>();
      
      cluster.skills.forEach(skill => {
        stepSkillMappings
          .filter(m => m.skill_id === skill.id)
          .forEach(mapping => {
            const step = careerSteps.find(s => s.id === mapping.step_id);
            if (step?.prerequisites?.length) {
              step.prerequisites.forEach(prereqId => {
                const prereqStep = careerSteps.find(s => s.id === prereqId);
                if (prereqStep) {
                  const prereqSkills = stepSkillMappings
                    .filter(m => m.step_id === prereqStep.id)
                    .map(m => skills.find(s => s.id === m.skill_id))
                    .filter(Boolean);
                  
                  prereqSkills.forEach(prereqSkill => {
                    if (prereqSkill!.category !== cluster.category) {
                      relatedClusters.add(prereqSkill!.category);
                    }
                  });
                }
              });
            }
          });
      });

      // Create edges to related clusters
      relatedClusters.forEach(relatedCategory => {
        const targetCluster = layout.clusters.find(c => c.category === relatedCategory);
        if (targetCluster) {
          edges.push({
            id: `cluster-relation-${cluster.id}-${targetCluster.id}`,
            source: cluster.id,
            target: targetCluster.id,
            type: 'smoothstep',
            style: {
              stroke: 'hsl(var(--muted-foreground))',
              strokeWidth: 1,
              strokeDasharray: '5,5',
              strokeOpacity: 0.4
            },
            data: {
              relationship: 'prerequisite'
            }
          });
        }
      });
    });

    return { nodes, edges };
  }, [categoryConfig, userProgress, displayControls.showSkills, stepSkillMappings, careerSteps, skills]);

  // Main generation function
  const generateSmartClusters = useCallback(() => {
    const layout = generateClusters();
    return generateClusterNodes(layout);
  }, [generateClusters, generateClusterNodes]);

  return {
    generateSmartClusters,
    categoryConfig
  };
};