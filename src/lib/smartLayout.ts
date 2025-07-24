import * as d3 from 'd3';
import { Node } from '@xyflow/react';
import { UnifiedCareerData, CareerRelationship } from './unifiedCareerData';

export interface LayoutNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  data: any;
  category: string;
  importance: number;
  hierarchyLevel: number;
  size: number;
}

export interface LayoutLink extends d3.SimulationLinkDatum<LayoutNode> {
  source: string | LayoutNode;
  target: string | LayoutNode;
  type: string;
  weight: number;
}

export interface ForceDirectedLayoutOptions {
  width: number;
  height: number;
  strength: {
    charge: number;
    link: number;
    collision: number;
    positioning: number;
    clustering: number;
  };
  distance: {
    link: number;
    collision: number;
  };
  iterations: number;
  alpha: number;
}

const DEFAULT_OPTIONS: ForceDirectedLayoutOptions = {
  width: 1200,
  height: 800,
  strength: {
    charge: -100,        // Reduced from -300 for less repulsion
    link: 0.2,           // Reduced from 0.5 for gentler connections
    collision: 1,
    positioning: 0.4,    // Reduced from 0.8 for softer hierarchical pull
    clustering: 0.2,     // Reduced from 0.3 for looser category grouping
  },
  distance: {
    link: 100,           // Reduced from 150 for shorter connections
    collision: 120,      // Increased from 80 for more breathing room
  },
  iterations: 150,       // Reduced from 300 to prevent over-simulation
  alpha: 0.5,           // Increased from 0.3 for faster stabilization
};

export interface LayoutDebugCallback {
  (data: {
    status: 'start' | 'progress' | 'complete' | 'error';
    progress?: number;
    nodes?: number;
    links?: number;
    error?: string;
    warning?: string;
    simulationStats?: any;
  }): void;
}

export class ForceDirectedLayout {
  private simulation: d3.Simulation<LayoutNode, LayoutLink>;
  private options: ForceDirectedLayoutOptions;
  private nodes: LayoutNode[] = [];
  private links: LayoutLink[] = [];
  private debugCallback?: LayoutDebugCallback;
  private startTime: number = 0;

  constructor(options: Partial<ForceDirectedLayoutOptions> = {}, debugCallback?: LayoutDebugCallback) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.simulation = d3.forceSimulation<LayoutNode, LayoutLink>();
    this.debugCallback = debugCallback;
  }

  calculateLayout(
    data: UnifiedCareerData,
    relationships: CareerRelationship[]
  ): Promise<Node[]> {
    return new Promise((resolve, reject) => {
      this.startTime = performance.now();
      
      try {
        this.debugCallback?.({
          status: 'start',
          nodes: 0,
          links: 0
        });

        // Transform data into layout nodes
        this.nodes = this.createLayoutNodes(data);
        this.links = this.createLayoutLinks(relationships, this.nodes);

        console.log('🚀 Force Layout Debug:', {
          totalNodes: this.nodes.length,
          totalLinks: this.links.length,
          nodeTypes: this.nodes.reduce((acc, node) => {
            acc[node.type] = (acc[node.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          linkTypes: this.links.reduce((acc, link) => {
            acc[link.type] = (acc[link.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });

        this.debugCallback?.({
          status: 'progress',
          progress: 10,
          nodes: this.nodes.length,
          links: this.links.length
        });

        // Validate data
        if (this.nodes.length === 0) {
          const error = 'No nodes available for layout calculation';
          this.debugCallback?.({ status: 'error', error });
          console.error('❌ Layout Error:', error);
          reject(new Error(error));
          return;
        }

        if (this.links.length === 0) {
          const warning = 'No relationships found - layout will use position forces only';
          this.debugCallback?.({ status: 'progress', warning, progress: 20 });
          console.warn('⚠️ Layout Warning:', warning);
        }

        // Configure simulation forces
        this.configureSimulation();

        this.debugCallback?.({
          status: 'progress',
          progress: 30
        });

        // Track simulation progress
        let iterationCount = 0;
        const maxIterations = this.options.iterations;

        this.simulation.on('tick', () => {
          iterationCount++;
          const progress = 30 + (iterationCount / maxIterations) * 60;
          
          if (iterationCount % 50 === 0) {
            console.log(`🔄 Simulation Progress: ${Math.round(progress)}% (${iterationCount}/${maxIterations})`);
            this.debugCallback?.({
              status: 'progress',
              progress,
              simulationStats: {
                iteration: iterationCount,
                alpha: this.simulation.alpha(),
                nodesWithPositions: this.nodes.filter(n => (n as any).x !== undefined && (n as any).y !== undefined).length
              }
            });
          }
        });

        // Start simulation
        this.simulation
          .nodes(this.nodes)
          .force('link', d3.forceLink<LayoutNode, LayoutLink>(this.links)
            .id(d => d.id)
            .strength(this.options.strength.link)
            .distance(this.options.distance.link)
          )
          .alpha(this.options.alpha)
          .restart();

        // Wait for simulation to stabilize
        this.simulation.on('end', () => {
          const calculationTime = performance.now() - this.startTime;
          console.log('✅ Force Layout Complete:', {
            duration: `${calculationTime.toFixed(2)}ms`,
            finalAlpha: this.simulation.alpha(),
            iterations: iterationCount
          });

          const reactFlowNodes = this.convertToReactFlowNodes();
          
          this.debugCallback?.({
            status: 'complete',
            progress: 100,
            simulationStats: {
              duration: calculationTime,
              finalAlpha: this.simulation.alpha(),
              totalIterations: iterationCount,
              nodesWithPositions: reactFlowNodes.length
            }
          });

          resolve(reactFlowNodes);
        });

        // Force early completion after timeout
        setTimeout(() => {
          const calculationTime = performance.now() - this.startTime;
          console.warn('⏰ Force Layout Timeout:', {
            duration: `${calculationTime.toFixed(2)}ms`,
            forcedStop: true,
            iterations: iterationCount
          });

          this.simulation.stop();
          const reactFlowNodes = this.convertToReactFlowNodes();
          
          this.debugCallback?.({
            status: 'complete',
            progress: 100,
            warning: 'Layout calculation timed out',
            simulationStats: {
              duration: calculationTime,
              timeout: true,
              iterations: iterationCount
            }
          });

          resolve(reactFlowNodes);
        }, this.options.iterations * 10);

      } catch (error) {
        const calculationTime = performance.now() - this.startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown layout error';
        
        console.error('💥 Force Layout Error:', {
          error: errorMessage,
          duration: `${calculationTime.toFixed(2)}ms`,
          nodes: this.nodes.length,
          links: this.links.length
        });

        this.debugCallback?.({
          status: 'error',
          error: errorMessage
        });

        reject(error);
      }
    });
  }

  private createLayoutNodes(data: UnifiedCareerData): LayoutNode[] {
    const nodes: LayoutNode[] = [];

    // Process skills
    data.skills.forEach((skill) => {
      nodes.push({
        id: skill.id,
        type: 'skill',
        data: skill,
        category: skill.category,
        importance: this.calculateSkillImportance(skill, data),
        hierarchyLevel: 0,
        size: this.calculateNodeSize('skill', skill),
      });
    });

    // Process courses
    data.courses.forEach((course) => {
      nodes.push({
        id: course.id,
        type: 'course',
        data: course,
        category: this.inferCourseCategory(course, data.skills),
        importance: this.calculateCourseImportance(course, data),
        hierarchyLevel: 1,
        size: this.calculateNodeSize('course', course),
      });
    });

    // Process projects
    data.projects.forEach((project) => {
      nodes.push({
        id: project.id,
        type: 'project',
        data: project,
        category: this.inferProjectCategory(project, data.skills),
        importance: this.calculateProjectImportance(project, data),
        hierarchyLevel: 2,
        size: this.calculateNodeSize('project', project),
      });
    });

    // Process certifications
    data.certifications.forEach((cert) => {
      nodes.push({
        id: cert.id,
        type: 'certification',
        data: cert,
        category: this.inferCertificationCategory(cert, data.skills),
        importance: this.calculateCertificationImportance(cert, data),
        hierarchyLevel: 3,
        size: this.calculateNodeSize('certification', cert),
      });
    });

    // Process career steps
    data.careerSteps.forEach((step) => {
      nodes.push({
        id: step.id,
        type: 'careerStep',
        data: step,
        category: this.inferCareerStepCategory(step),
        importance: this.calculateCareerStepImportance(step, data),
        hierarchyLevel: 4,
        size: this.calculateNodeSize('careerStep', step),
      });
    });

    // Process jobs
    data.jobs.forEach((job) => {
      nodes.push({
        id: job.id,
        type: 'job',
        data: job,
        category: job.industry,
        importance: this.calculateJobImportance(job, data),
        hierarchyLevel: 5,
        size: this.calculateNodeSize('job', job),
      });
    });

    return nodes;
  }

  private createLayoutLinks(
    relationships: CareerRelationship[],
    nodes: LayoutNode[]
  ): LayoutLink[] {
    return relationships
      .map((rel) => {
        const source = nodes.find((n) => n.id === rel.from);
        const target = nodes.find((n) => n.id === rel.to);

        if (!source || !target) return null;

        return {
          source: source.id,
          target: target.id,
          type: rel.type,
          weight: rel.weight || 1,
        };
      })
      .filter(Boolean) as LayoutLink[];
  }

  private configureSimulation(): void {
    const { width, height, strength, distance } = this.options;
    
    // Adaptive force strength based on graph density
    const density = this.links.length / Math.max(this.nodes.length, 1);
    const densityMultiplier = density > 3 ? 0.5 : density > 2 ? 0.7 : 1; // Reduce forces for dense graphs
    
    console.log('📊 Graph Density Analysis:', {
      nodes: this.nodes.length,
      links: this.links.length,
      density: density.toFixed(2),
      densityMultiplier: densityMultiplier.toFixed(2)
    });

    this.simulation
      // Repulsion force to prevent overlapping (adaptive)
      .force(
        'charge',
        d3.forceManyBody()
          .strength(strength.charge * densityMultiplier)
          .distanceMax(150) // Reduced from 200 for tighter control
      )
      
      // Link force to connect related nodes (adaptive)
      .force(
        'link',
        d3.forceLink<LayoutNode, LayoutLink>()
          .id((d) => d.id)
          .distance((d) => distance.link * (1 / Math.sqrt(d.weight)))
          .strength(strength.link * densityMultiplier)
      )
      
      // Collision force to prevent overlap (increased for dense graphs)
      .force(
        'collision',
        d3.forceCollide<LayoutNode>()
          .radius((d) => d.size + distance.collision * (1 + density * 0.2)) // More space for dense graphs
          .strength(strength.collision)
      )
      
      // Hierarchical positioning force (gentler for dense graphs)
      .force(
        'positioning',
        this.createHierarchicalForce(densityMultiplier)
      )
      
      // Clustering force (adaptive)
      .force(
        'clustering',
        this.createClusteringForce(densityMultiplier)
      )
      
      // Center force
      .force(
        'center',
        d3.forceCenter(width / 2, height / 2)
      );
  }

  private createHierarchicalForce(densityMultiplier: number = 1): d3.Force<LayoutNode, undefined> {
    const { height, strength } = this.options;
    const levelHeight = height / 6; // 6 hierarchy levels

    return d3.forceY<LayoutNode>()
      .y((d) => d.hierarchyLevel * levelHeight + levelHeight / 2)
      .strength(strength.positioning * densityMultiplier * 0.6); // Gentler hierarchical pull
  }

  private createClusteringForce(densityMultiplier: number = 1): d3.Force<LayoutNode, undefined> {
    const { width, strength } = this.options;
    const categories = [...new Set(this.nodes.map(n => n.category))];
    const clusterWidth = width / Math.max(categories.length, 1);

    return d3.forceX<LayoutNode>()
      .x((d) => {
        const categoryIndex = categories.indexOf(d.category);
        return categoryIndex * clusterWidth + clusterWidth / 2;
      })
      .strength(strength.clustering * densityMultiplier);
  }

  private convertToReactFlowNodes(): Node[] {
    return this.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: ((node as any).x || 0) - node.size / 2,
        y: ((node as any).y || 0) - node.size / 2,
      },
      data: this.transformNodeData(node),
    }));
  }

  private transformNodeData(node: LayoutNode): any {
    const { data, type } = node;
    
    switch (type) {
      case 'skill':
        return {
          name: data.name,
          category: data.category,
          description: data.description,
        };
      case 'course':
        return {
          title: data.title,
          description: data.description,
          platform: data.platform,
          cost: data.cost,
          difficulty: data.difficulty,
          skillTags: data.skill_tags,
          url: data.url,
        };
      case 'project':
        return {
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          estimatedTime: data.estimated_time,
          skillsDemonstrated: data.skills_demonstrated,
          projectType: data.project_type,
        };
      case 'certification':
        return {
          title: data.title,
          issuer: data.issuer,
          description: data.description,
          cost: data.cost,
          validity: data.validity,
          skillsValidated: data.skills_validated,
        };
      case 'careerStep':
        return {
          title: data.title,
          description: data.description,
          level: data.level,
          isTerminal: data.is_terminal,
          prerequisites: data.prerequisites,
          skills: data.skills,
        };
      case 'job':
        return {
          title: data.title,
          description: data.description,
          level: data.level,
          industry: data.industry,
          averageSalary: data.average_salary,
          roiScore: data.roi_score,
          growthOutlook: data.growth_outlook,
          requiredSkillIds: data.required_skill_ids,
        };
      default:
        return data;
    }
  }

  // Importance calculation methods
  private calculateSkillImportance(skill: any, data: UnifiedCareerData): number {
    // Count how many jobs require this skill
    const jobsCount = data.jobs.filter(job => 
      job.required_skill_ids.includes(skill.id)
    ).length;
    
    // Count how many courses teach this skill
    const coursesCount = data.courses.filter(course =>
      course.skill_tags.some(tag => 
        tag.toLowerCase().includes(skill.name.toLowerCase())
      )
    ).length;

    return (jobsCount * 3) + (coursesCount * 1) + skill.difficulty_level;
  }

  private calculateCourseImportance(course: any, data: UnifiedCareerData): number {
    const skillCount = course.skill_tags.length;
    const difficultyWeight = course.difficulty === 'advanced' ? 3 : 
                           course.difficulty === 'intermediate' ? 2 : 1;
    
    return skillCount + difficultyWeight;
  }

  private calculateProjectImportance(project: any, data: UnifiedCareerData): number {
    const skillCount = project.skills_demonstrated.length;
    const difficultyWeight = project.difficulty === 'advanced' ? 3 : 
                           project.difficulty === 'intermediate' ? 2 : 1;
    const typeWeight = project.project_type === 'portfolio' ? 2 : 1;
    
    return skillCount + difficultyWeight + typeWeight;
  }

  private calculateCertificationImportance(cert: any, data: UnifiedCareerData): number {
    return cert.skills_validated.length + (cert.cost === 'Free' ? 1 : 2);
  }

  private calculateCareerStepImportance(step: any, data: UnifiedCareerData): number {
    const skillCount = step.skills ? step.skills.length : 0;
    const terminalWeight = step.is_terminal ? 3 : 1;
    
    return skillCount + terminalWeight;
  }

  private calculateJobImportance(job: any, data: UnifiedCareerData): number {
    const skillCount = job.required_skill_ids.length;
    const salaryWeight = Math.log(job.average_salary / 10000);
    const roiWeight = job.roi_score;
    
    return skillCount + salaryWeight + roiWeight;
  }

  // Category inference methods
  private inferCourseCategory(course: any, skills: any[]): string {
    if (course.skill_tags.length === 0) return 'General';
    
    const firstSkillTag = course.skill_tags[0];
    const matchingSkill = skills.find(s => 
      s.name.toLowerCase().includes(firstSkillTag.toLowerCase())
    );
    
    return matchingSkill?.category || 'General';
  }

  private inferProjectCategory(project: any, skills: any[]): string {
    if (project.skills_demonstrated.length === 0) return 'General';
    
    const firstSkill = project.skills_demonstrated[0];
    const matchingSkill = skills.find(s => 
      s.name.toLowerCase().includes(firstSkill.toLowerCase())
    );
    
    return matchingSkill?.category || 'General';
  }

  private inferCertificationCategory(cert: any, skills: any[]): string {
    if (cert.skills_validated.length === 0) return 'General';
    
    const firstSkill = cert.skills_validated[0];
    const matchingSkill = skills.find(s => 
      s.name.toLowerCase().includes(firstSkill.toLowerCase())
    );
    
    return matchingSkill?.category || 'General';
  }

  private inferCareerStepCategory(step: any): string {
    if (!step.skills || step.skills.length === 0) return 'General';
    
    // Use the category of the most important skill
    const mostImportantSkill = step.skills.reduce((prev: any, current: any) => 
      (prev.importance > current.importance) ? prev : current
    );
    
    return mostImportantSkill.category || 'General';
  }

  // Node size calculation
  private calculateNodeSize(type: string, data: any): number {
    const baseSizes = {
      skill: 40,
      course: 45,
      project: 50,
      certification: 45,
      careerStep: 55,
      job: 60,
    };
    
    const baseSize = baseSizes[type as keyof typeof baseSizes] || 40;
    
    // Adjust based on importance (will be calculated during layout)
    return baseSize;
  }

  // Public methods for runtime adjustment
  updateOptions(newOptions: Partial<ForceDirectedLayoutOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  stop(): void {
    this.simulation.stop();
  }

  restart(): void {
    this.simulation.restart();
  }
}

// Helper function for calculating smart positioning
export const calculateForceDirectedLayout = async (
  data: UnifiedCareerData,
  relationships: CareerRelationship[],
  options?: Partial<ForceDirectedLayoutOptions>,
  debugCallback?: LayoutDebugCallback
): Promise<Node[]> => {
  const layout = new ForceDirectedLayout(options, debugCallback);
  return layout.calculateLayout(data, relationships);
};