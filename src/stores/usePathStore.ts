import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

// Robust normalizer for deduplication
const slug = (s?: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")     // strip accents
    .replace(/[\.\-_/]/g, " ")          // unify punctuation
    .replace(/\s+/g, " ")               // collapse spaces
    .trim();

// Enhanced synonym mapping
const TITLE_SYNONYMS: Record<string, string> = {
  "js": "JavaScript Basics",
  "javascript": "JavaScript Basics",
  "html": "HTML & CSS Foundations",
  "css": "HTML & CSS Foundations",
  "ts": "TypeScript Fundamentals",
  "typescript": "TypeScript Fundamentals",
  "node": "Node.js Essentials",
  "nodejs": "Node.js Essentials",
  "express": "Express.js Framework",
  "react": "React Fundamentals",
  "rest": "REST API Design",
  "api": "API Development",
  "sql": "SQL Database Fundamentals",
  "database": "SQL Database Fundamentals",
  "python": "Python Programming",
  "algorithms": "Data Structures & Algorithms",
  "data structures": "Data Structures & Algorithms",
  "git": "Git Version Control",
  "typescript basics": "TypeScript Fundamentals",
  "advanced javascript": "JavaScript Advanced Concepts",
  "node.js": "Node.js Essentials",
};

const canonicalTitle = (label: string) =>
  TITLE_SYNONYMS[slug(label)] ?? label;

// Canonical course catalog for auto-filling prerequisites
const canonicalCatalog: Array<{
  title: string;
  skills: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}> = [
  { title: 'JavaScript Basics', skills: ['javascript', 'programming'], difficulty: 'beginner', estimatedHours: 20 },
  { title: 'HTML & CSS Foundations', skills: ['html', 'css', 'web development'], difficulty: 'beginner', estimatedHours: 15 },
  { title: 'React Fundamentals', skills: ['react', 'javascript', 'frontend'], difficulty: 'intermediate', estimatedHours: 30 },
  { title: 'Node.js Essentials', skills: ['node.js', 'javascript', 'backend'], difficulty: 'intermediate', estimatedHours: 25 },
  { title: 'Python Programming', skills: ['python', 'programming'], difficulty: 'beginner', estimatedHours: 25 },
  { title: 'Data Structures & Algorithms', skills: ['algorithms', 'data structures', 'programming'], difficulty: 'intermediate', estimatedHours: 40 },
  { title: 'Database Fundamentals', skills: ['sql', 'databases'], difficulty: 'beginner', estimatedHours: 20 },
  { title: 'Git Version Control', skills: ['git', 'version control'], difficulty: 'beginner', estimatedHours: 10 },
  { title: 'TypeScript Basics', skills: ['typescript', 'javascript'], difficulty: 'intermediate', estimatedHours: 15 },
  { title: 'API Development', skills: ['api', 'rest', 'backend'], difficulty: 'intermediate', estimatedHours: 30 },
];

export interface PathNode extends Node {
  type: 'track' | 'course' | 'project' | 'milestone';
  data: {
    title: string;
    description?: string;
    trackId?: string;
    institutionId?: string;
    teacherId?: string;
    verification?: 'self_reported' | 'institution_verified' | 'mentor_verified';
    progress?: number;
    xp?: number;
    cri?: number;
    estimatedHours?: number;
    cost?: number;
    skillTags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    
    // Prerequisites & Smart Ordering
    prerequisites?: string[];  // skill tags or node IDs
    suggestedNext?: string[];  // recommended next skill tags or node IDs
    status?: 'locked' | 'available' | 'in_progress' | 'completed';
  };
}

export interface PathEdge extends Edge {
  type: 'prerequisite' | 'sequence' | 'branch' | 'suggested' | 'alternative';
}

interface PathState {
  nodes: PathNode[];
  edges: PathEdge[];
  activeNodeId?: string;
  selectedEdgeType: PathEdge['type'];

  // Database persistence
  currentPathId?: string;
  pathTitle: string;
  isShared: boolean;
  isDirty: boolean;
  lastSaved?: Date;

  // User skills (aggregated from transcripts/completions)
  userSkills: string[];
  refreshUserSkills: (userId?: string) => Promise<void>;

  // Database operations
  savePath: (userId: string) => Promise<string | null>;
  loadPath: (pathId: string, userId?: string) => Promise<void>;
  loadUserPaths: (userId: string) => Promise<Array<{ id: string; title: string; updated_at: string }>>;
  createNewPath: (userId: string, title?: string) => Promise<string | null>;
  shareOrUnsharePath: (toggle: boolean) => Promise<void>;
  
  // Actions
  addNode: (node: Omit<PathNode, 'id'>) => string;
  updateNode: (id: string, updates: Partial<PathNode['data']>) => void;
  removeNode: (id: string) => void;
  
  connect: (sourceId: string, targetId: string, edgeType?: PathEdge['type']) => void;
  removeEdge: (id: string) => void;
  
  moveNode: (id: string, position: { x: number; y: number }) => void;
  setActiveNode: (id?: string) => void;
  setSelectedEdgeType: (edgeType: PathEdge['type']) => void;
  
  forkNode: (id: string, providerOverride?: { institutionId?: string; teacherId?: string }) => void;
  mergeNodes: (ids: string[]) => void;
  swapProvider: (nodeId: string, institutionId?: string, teacherId?: string) => void;
  
  // Prerequisites & Smart Ordering
  setNodeStatus: (id: string, status: PathNode['data']['status']) => void;
  setPrerequisites: (id: string, prerequisites: string[]) => void;
  setSuggestedNext: (id: string, suggestedNext: string[]) => void;
  validatePrerequisites: (id: string) => { ok: boolean; missing: string[] };
  autoLayoutPrereqOrder: () => void;
  autoLayoutTree: (orientation?: "LR" | "TB") => void;
  getSuggestedNextSteps: (nodeId: string) => string[];
  ensurePrerequisiteClosure: () => void;
  getOrCreateCourseByTitle: (title: string, seed?: Partial<PathNode["data"]>) => string;
  mergeDuplicateNodesByTitle: () => void;
  
  // Bulk operations
  loadTrackNodes: (trackId: string) => void;
  clearCanvas: () => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      activeNodeId: undefined,
      selectedEdgeType: 'sequence' as PathEdge['type'],
      userSkills: [],

      // Database persistence state
      currentPathId: undefined,
      pathTitle: 'My Learning Path',
      isShared: false,
      isDirty: false,
      lastSaved: undefined,

      // Database operations
      async savePath(userId: string) {
        const { currentPathId, pathTitle, nodes, edges } = get();
        
        try {
          let pathId = currentPathId;
          
          // Create or update path
          if (!pathId) {
            const { data, error } = await supabase
              .from('user_paths')
              .insert({
                user_id: userId,
                title: pathTitle,
                is_active: true,
              })
              .select('id')
              .single();
            
            if (error) throw error;
            pathId = data.id;
            set({ currentPathId: pathId });
          } else {
            const { error } = await supabase
              .from('user_paths')
              .update({
                title: pathTitle,
                updated_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString(),
              })
              .eq('id', pathId);
            
            if (error) throw error;
          }
          
          // Save nodes
          if (nodes.length > 0) {
            // Delete existing nodes for this path
            await supabase
              .from('path_nodes')
              .delete()
              .eq('path_id', pathId);
            
            // Insert new nodes
            const nodeInserts = nodes.map(node => ({
              path_id: pathId,
              node_id: node.id,
              node_type: node.type,
              title: node.data.title,
              description: node.data.description,
              position_x: node.position.x,
              position_y: node.position.y,
              node_data: {
                ...node.data,
                // Extract position since it's stored separately
                position: undefined
              }
            }));
            
            const { error: nodesError } = await supabase
              .from('path_nodes')
              .insert(nodeInserts);
            
            if (nodesError) throw nodesError;
          }
          
          // Save edges
          if (edges.length > 0) {
            // Delete existing edges for this path
            await supabase
              .from('path_edges')
              .delete()
              .eq('path_id', pathId);
            
            // Insert new edges
            const edgeInserts = edges.map(edge => ({
              path_id: pathId,
              edge_id: edge.id,
              source_node_id: edge.source,
              target_node_id: edge.target,
              edge_type: edge.type,
              edge_data: JSON.parse(JSON.stringify({
                style: edge.style || {},
                markerEnd: edge.markerEnd || null
              }))
            }));
            
            const { error: edgesError } = await supabase
              .from('path_edges')
              .insert(edgeInserts);
            
            if (edgesError) throw edgesError;
          }
          
          set({ 
            isDirty: false, 
            lastSaved: new Date() 
          });
          
          return pathId;
        } catch (error) {
          console.error('Error saving path:', error);
          return null;
        }
      },

      async loadPath(pathId: string, userId?: string) {
        try {
          // Load path metadata
          const { data: pathData, error: pathError } = await supabase
            .from('user_paths')
            .select('*')
            .eq('id', pathId)
            .single();
          
          if (pathError) throw pathError;
          
          // Load nodes
          const { data: nodesData, error: nodesError } = await supabase
            .from('path_nodes')
            .select('*')
            .eq('path_id', pathId);
          
          if (nodesError) throw nodesError;
          
          // Load edges
          const { data: edgesData, error: edgesError } = await supabase
            .from('path_edges')
            .select('*')
            .eq('path_id', pathId);
          
          if (edgesError) throw edgesError;
          
          // Transform data back to frontend format
          const nodes: PathNode[] = (nodesData || []).map(dbNode => ({
            id: dbNode.node_id,
            type: dbNode.node_type as PathNode['type'],
            position: {
              x: Number(dbNode.position_x),
              y: Number(dbNode.position_y)
            },
            data: {
              title: dbNode.title,
              description: dbNode.description,
              ...((dbNode.node_data as any) || {})
            }
          }));
          
          const edges: PathEdge[] = (edgesData || []).map(dbEdge => ({
            id: dbEdge.edge_id,
            source: dbEdge.source_node_id,
            target: dbEdge.target_node_id,
            type: dbEdge.edge_type as PathEdge['type'],
            ...((dbEdge.edge_data as any) || {}),
            style: getEdgeStyle(dbEdge.edge_type as PathEdge['type'])
          }));
          
          set({
            currentPathId: pathId,
            pathTitle: pathData.title,
            isShared: pathData.is_shared,
            nodes,
            edges,
            isDirty: false,
            lastSaved: new Date(pathData.updated_at),
            activeNodeId: undefined
          });
          
          // Update last accessed
          await supabase
            .from('user_paths')
            .update({ last_accessed_at: new Date().toISOString() })
            .eq('id', pathId);
            
        } catch (error) {
          console.error('Error loading path:', error);
        }
      },

      async loadUserPaths(userId: string) {
        try {
          const { data, error } = await supabase
            .from('user_paths')
            .select('id, title, updated_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });
          
          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Error loading user paths:', error);
          return [];
        }
      },

      async createNewPath(userId: string, title = 'New Learning Path') {
        try {
          const { data, error } = await supabase
            .from('user_paths')
            .insert({
              user_id: userId,
              title,
              is_active: true,
            })
            .select('id')
            .single();
          
          if (error) throw error;
          
          // Reset canvas and set new path
          set({
            currentPathId: data.id,
            pathTitle: title,
            isShared: false,
            nodes: [],
            edges: [],
            activeNodeId: undefined,
            isDirty: false,
            lastSaved: new Date()
          });
          
          return data.id;
        } catch (error) {
          console.error('Error creating new path:', error);
          return null;
        }
      },

      async shareOrUnsharePath(toggle: boolean) {
        const { currentPathId } = get();
        if (!currentPathId) return;
        
        try {
          const updates: any = { is_shared: toggle };
          
          // Generate share token if sharing
          if (toggle) {
            updates.share_token = `share-${currentPathId}-${Date.now()}`;
          } else {
            updates.share_token = null;
          }
          
          const { error } = await supabase
            .from('user_paths')
            .update(updates)
            .eq('id', currentPathId);
          
          if (error) throw error;
          
          set({ isShared: toggle });
        } catch (error) {
          console.error('Error updating path sharing:', error);
        }
      },

      async refreshUserSkills(userIdParam?: string) {
        // Resolve user id if not provided
        let userId = userIdParam;
        if (!userId) {
          const { data } = await supabase.auth.getUser();
          userId = data.user?.id;
        }
        if (!userId) return;

        // Fetch transcripts and aggregate skill tags
        const { data: rows, error } = await supabase
          .from('transcripts')
          .select('skill_tags')
          .eq('user_id', userId);
        if (error) {
          console.warn('refreshUserSkills error', error);
          return;
        }
        const setLower = new Set<string>();
        rows?.forEach((r: any) => {
          (r.skill_tags || []).forEach((s: string) => setLower.add(String(s).trim().toLowerCase()));
        });

        // Also include skills from completed nodes on canvas
        const { nodes } = get();
        nodes
          .filter(n => n.data.status === 'completed')
          .forEach(n => {
            n.data.skillTags?.forEach(s => setLower.add(String(s).trim().toLowerCase()));
            if (n.data.title) setLower.add(n.data.title.trim().toLowerCase());
          });

        set({ userSkills: Array.from(setLower) });
      },

      addNode: (nodeData) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNode: PathNode = {
          id,
          position: { x: 100, y: 100 },
          ...nodeData,
        };
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
          isDirty: true,
        }));
        
        return id;
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          ),
          isDirty: true,
        }));
      },

      removeNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter(
            (edge) => edge.source !== id && edge.target !== id
          ),
          activeNodeId: state.activeNodeId === id ? undefined : state.activeNodeId,
          isDirty: true,
        }));
      },

      connect: (sourceId, targetId, edgeType) => {
        const { selectedEdgeType } = get();
        const finalEdgeType = edgeType || selectedEdgeType;
        
        // Prevent self-connections and duplicates
        if (sourceId === targetId) return;
        
        // Enhanced duplicate prevention with edge key
        const edgeKey = `${finalEdgeType}:${sourceId}->${targetId}`;
        const existingEdge = get().edges.find(e => 
          `${e.type}:${e.source}->${e.target}` === edgeKey
        );
        if (existingEdge) return;
        
        const newEdge: PathEdge = {
          id: `edge-${sourceId}-${targetId}-${finalEdgeType}`,
          source: sourceId,
          target: targetId,
          type: finalEdgeType,
          markerEnd: { type: 'arrowclosed' as any },
          style: getEdgeStyle(finalEdgeType),
        };
        
        set((state) => ({
          edges: [...state.edges, newEdge],
          isDirty: true,
        }));
        
        // If prerequisite edge, update target node status
        if (finalEdgeType === 'prerequisite') {
          const { validatePrerequisites } = get();
          const validation = validatePrerequisites(targetId);
          const targetStatus = validation.ok ? 'available' : 'locked';
          get().setNodeStatus(targetId, targetStatus);
        }
      },

      removeEdge: (id) => {
        const edgeToRemove = get().edges.find(e => e.id === id);
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
          isDirty: true,
        }));

        if (edgeToRemove?.type === 'prerequisite') {
          const { validatePrerequisites, setNodeStatus } = get();
          const res = validatePrerequisites(edgeToRemove.target);
          const targetNode = get().nodes.find(n => n.id === edgeToRemove.target);
          if (targetNode && targetNode.data.status !== 'completed') {
            setNodeStatus(edgeToRemove.target, res.ok ? 'available' : 'locked');
          }
        }
      },

      moveNode: (id, position) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, position } : node
          ),
          isDirty: true,
        }));
      },

      setActiveNode: (id) => {
        set({ activeNodeId: id });
      },

      setSelectedEdgeType: (edgeType) => {
        set({ selectedEdgeType: edgeType });
      },

      forkNode: (id, providerOverride) => {
        const { nodes } = get();
        const originalNode = nodes.find((n) => n.id === id);
        if (!originalNode) return;

        const forkedNode: PathNode = {
          ...originalNode,
          id: `fork-${id}-${Date.now()}`,
          position: {
            x: originalNode.position.x + 200,
            y: originalNode.position.y,
          },
          data: {
            ...originalNode.data,
            ...providerOverride,
            title: `${originalNode.data.title} (Fork)`,
          },
        };

        set((state) => ({
          nodes: [...state.nodes, forkedNode],
        }));
      },

      mergeNodes: (ids) => {
        const { nodes } = get();
        const targetNodes = nodes.filter((n) => ids.includes(n.id));
        if (targetNodes.length < 2) return;

        // Keep the node with highest CRI
        const bestNode = targetNodes.reduce((best, current) => 
          (current.data.cri || 0) > (best.data.cri || 0) ? current : best
        );

        set((state) => ({
          nodes: state.nodes.filter((n) => !ids.includes(n.id) || n.id === bestNode.id),
          edges: state.edges.filter((e) => 
            !ids.some(id => id !== bestNode.id && (e.source === id || e.target === id))
          ),
        }));
      },

      swapProvider: (nodeId, institutionId, teacherId) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    institutionId,
                    teacherId,
                  },
                }
              : node
          ),
        }));
      },

      loadTrackNodes: (trackId) => {
        // TODO: Integrate with existing track data
        // This would load courses, projects, milestones from a track
        console.log('Loading track nodes for:', trackId);
      },

      // Prerequisites & Smart Ordering methods
      setNodeStatus: (id, status) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, status } }
              : node
          ),
        }));

        // Re-evaluate downstream targets for prerequisite edges
        const { edges, validatePrerequisites, setNodeStatus, refreshUserSkills, nodes } = get();
        // Update user skills cache when a node is completed or reverted
        refreshUserSkills().catch(() => {});
        const downstream = edges.filter(e => e.type === 'prerequisite' && e.source === id);
        downstream.forEach(e => {
          const target = nodes.find(n => n.id === e.target);
          if (target && target.data.status !== 'completed') {
            const res = validatePrerequisites(e.target);
            setNodeStatus(e.target, res.ok ? 'available' : 'locked');
          }
        });
      },

      setPrerequisites: (id, prerequisites) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, prerequisites } }
              : node
          ),
        }));
      },

      setSuggestedNext: (id, suggestedNext) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, suggestedNext } }
              : node
          ),
        }));
      },

      validatePrerequisites: (id) => {
        const { nodes, edges, userSkills } = get();
        const node = nodes.find(n => n.id === id);
        if (!node) return { ok: true, missing: [] };

        const toKey = (s: string) => String(s).trim().toLowerCase();
        const acquired = new Set<string>((userSkills || []).map(toKey));

        // Include skills/titles from completed nodes
        nodes.filter(n => n.data.status === 'completed').forEach(n => {
          n.data.skillTags?.forEach(s => acquired.add(toKey(s)));
          if (n.data.title) acquired.add(toKey(n.data.title));
        });

        const missing: string[] = [];

        // 1) Node-based prerequisites via edges
        const prereqEdges = edges.filter(e => e.target === id && e.type === 'prerequisite');
        prereqEdges.forEach(e => {
          const src = nodes.find(n => n.id === e.source);
          if (src?.data.status !== 'completed') {
            missing.push(src?.data.title || e.source);
          }
        });

        // 2) Skill-based prerequisites (free-text list on node)
        const nodePrereqs = node.data.prerequisites || [];
        nodePrereqs.forEach(req => {
          const key = toKey(req);
          // already satisfied by skills cache?
          if (acquired.has(key)) return;
          // satisfied by a completed node title (exact or fuzzy match)?
          const matchedNode = nodes.find(n => {
            if (!n.data.title || n.data.status !== 'completed') return false;
            const titleKey = toKey(n.data.title);
            return titleKey === key || titleKey.includes(key) || key.includes(titleKey);
          });
          if (matchedNode) return;
          // otherwise it's missing (prevent duplicates)
          if (!missing.includes(req)) {
            missing.push(req);
          }
        });

        return { ok: missing.length === 0, missing };
      },

      autoLayoutPrereqOrder: () => {
        const { nodes, edges } = get();
        const prereqEdges = edges.filter(e => e.type === 'prerequisite');
        
        // Simple topological sort by prerequisites
        const visited = new Set<string>();
        const sorted: PathNode[] = [];
        const visiting = new Set<string>();
        
        const visit = (nodeId: string) => {
          if (visiting.has(nodeId)) return; // Cycle detection
          if (visited.has(nodeId)) return;
          
          visiting.add(nodeId);
          
          // Visit all prerequisites first
          const prereqs = prereqEdges.filter(e => e.target === nodeId);
          prereqs.forEach(edge => visit(edge.source));
          
          visiting.delete(nodeId);
          visited.add(nodeId);
          
          const node = nodes.find(n => n.id === nodeId);
          if (node) sorted.push(node);
        };
        
        nodes.forEach(node => visit(node.id));
        
        // Layout nodes left to right
        const updatedNodes = sorted.map((node, index) => ({
          ...node,
          position: {
            x: index * 300 + 100,
            y: node.position.y,
          },
        }));
        
        set({ nodes: updatedNodes });
      },

      autoLayoutTree: (orientation = "LR") => {
        const { nodes, edges } = get();
        const prereqEdges = edges.filter(e => e.type === 'prerequisite');
        
        // Build DAG using only prerequisite edges
        const graph = new Map<string, Set<string>>();
        const inDegree = new Map<string, number>();
        
        // Initialize all nodes
        nodes.forEach(node => {
          graph.set(node.id, new Set());
          inDegree.set(node.id, 0);
        });
        
        // Build adjacency list and calculate in-degrees
        prereqEdges.forEach(edge => {
          graph.get(edge.source)?.add(edge.target);
          inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        });
        
        // Topological sort via BFS (Kahn's algorithm)
        const levels: string[][] = [];
        const queue: string[] = [];
        const nodeLevel = new Map<string, number>();
        
        // Start with nodes having no prerequisites (in-degree 0)
        nodes.forEach(node => {
          if (inDegree.get(node.id) === 0) {
            queue.push(node.id);
            nodeLevel.set(node.id, 0);
          }
        });
        
        while (queue.length > 0) {
          const levelSize = queue.length;
          const currentLevel: string[] = [];
          
          for (let i = 0; i < levelSize; i++) {
            const nodeId = queue.shift()!;
            currentLevel.push(nodeId);
            
            // Process neighbors
            graph.get(nodeId)?.forEach(neighborId => {
              const newInDegree = (inDegree.get(neighborId) || 0) - 1;
              inDegree.set(neighborId, newInDegree);
              
              if (newInDegree === 0) {
                const level = (nodeLevel.get(nodeId) || 0) + 1;
                nodeLevel.set(neighborId, level);
                queue.push(neighborId);
              }
            });
          }
          
          if (currentLevel.length > 0) {
            levels.push(currentLevel);
          }
        }
        
        // Layout constants
        const XG = 280, YG = 140, PADX = 80, PADY = 80;
        
        // Position nodes on grid with parent-child slot averaging
        const updatedNodes = nodes.map(node => {
          const level = nodeLevel.get(node.id) || 0;
          const levelNodes = levels[level] || [];
          const indexInLevel = levelNodes.indexOf(node.id);
          
          // Calculate average position from parents for better grouping
          const parents = prereqEdges
            .filter(e => e.target === node.id)
            .map(e => e.source);
            
          let avgParentY = 0;
          if (parents.length > 0) {
            const parentPositions = parents.map(parentId => {
              const parent = nodes.find(n => n.id === parentId);
              return parent?.position.y || 0;
            });
            avgParentY = parentPositions.reduce((sum, y) => sum + y, 0) / parentPositions.length;
          }
          
          const baseY = avgParentY || (PADY + indexInLevel * YG);
          
          if (orientation === "LR") {
            return {
              ...node,
              position: {
                x: PADX + level * XG,
                y: baseY,
              },
            };
          } else { // TB
            return {
              ...node,
              position: {
                x: PADX + indexInLevel * XG,
                y: PADY + level * YG,
              },
            };
          }
        });
        
        set({ nodes: updatedNodes });
        
        // Optional: fit view after layout
        setTimeout(() => {
          // Trigger a fitView if React Flow instance is available
          console.log('🎨 Tree layout complete, consider calling fitView()');
        }, 100);
      },

      getSuggestedNextSteps: (nodeId) => {
        const { nodes } = get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return [];
        
        // Mock suggestions based on difficulty progression and skill gaps
        const suggestions = [];
        
        if (node.data.difficulty === 'beginner') {
          suggestions.push('Intermediate JavaScript', 'React Fundamentals', 'CSS Grid');
        } else if (node.data.difficulty === 'intermediate') {
          suggestions.push('Advanced React', 'Node.js Backend', 'TypeScript');
        } else {
          suggestions.push('System Design', 'Advanced Architecture', 'Leadership');
        }
        
        return suggestions;
      },

      ensurePrerequisiteClosure: async () => {
        console.log('⚡ ensurePrerequisiteClosure clicked - starting...');
        
        // Show immediate feedback
        toast.loading('Auto-filling prerequisites...', { id: 'auto-fill' });
        
        // Refresh user skills first
        await get().refreshUserSkills();
        
        const { nodes, edges, getOrCreateCourseByTitle, connect, validatePrerequisites, userSkills, autoLayoutTree, setNodeStatus, mergeDuplicateNodesByTitle } = get();


        const indexByTitle = () => {
          const map = new Map<string, string>();
          get().nodes.forEach(n => map.set(slug(n.data.title), n.id));
          return map;
        };

        let titleIndex = indexByTitle();
        let changed = false;
        let iterations = 0;
        let totalAdded = 0;

        console.log('🔍 Starting auto-fill prerequisites...');
        console.log(`📊 Current state: ${nodes.length} nodes, ${edges.length} edges`);

        // Iterate until stable (or safe cap)
        while (iterations++ < 20) {
          changed = false;
          console.log(`🔄 Iteration ${iterations}`);

          for (const target of get().nodes) {
            const validation = validatePrerequisites(target.id);
            const { ok, missing } = validation;
            
            if (ok || missing.length === 0) {
              console.log(`✅ Node "${target.data.title}" has all prerequisites satisfied`);
              continue;
            }

            console.log(`📋 Node "${target.data.title}" missing ${missing.length} prerequisites:`, missing);

            for (const item of missing) {
              console.log(`🔎 Processing prerequisite: "${item}"`);
              
              // Use robust canonicalization and deduplication
              const want = canonicalTitle(item);
              const prereqId = getOrCreateCourseByTitle(want, {
                description: `Auto-generated prerequisite for ${item}`,
                skillTags: [item],
                difficulty: 'beginner',
                estimatedHours: 10,
              });

              // Check if already connected
              const alreadyConnected = get().edges.some(e => 
                e.type === 'prerequisite' && e.source === prereqId && e.target === target.id
              );
              
              if (!alreadyConnected) {
                console.log(`🔗 Connecting "${want}" to "${target.data.title}"`);
                connect(prereqId, target.id, 'prerequisite');
                changed = true;
                totalAdded++;
              }
            }
          }

          if (!changed) {
            console.log(`🛑 No more changes needed after ${iterations} iterations`);
            break;
          }
        }

        // Merge any duplicates created during the process
        mergeDuplicateNodesByTitle();
        
        // Use tree layout instead of the old linear layout
        autoLayoutTree("LR");

        console.log(`✨ Auto-fill complete! Added ${totalAdded} prerequisites`);
        
        // Show completion toast
        if (totalAdded > 0) {
          toast.success(`Added ${totalAdded} prerequisite${totalAdded > 1 ? 's' : ''}!`, { id: 'auto-fill' });
        } else {
          toast.success('All prerequisites already satisfied!', { id: 'auto-fill' });
        }

        // Log any remaining unresolved prerequisites for debugging
        const stillUnresolved: string[] = [];
        get().nodes.forEach(node => {
          const validation = validatePrerequisites(node.id);
          if (!validation.ok) {
            stillUnresolved.push(...validation.missing);
          }
        });
        
        if (stillUnresolved.length > 0) {
          console.table(stillUnresolved.map(item => ({
            raw: item,
            slug: slug(item),
            canonical: canonicalTitle(item)
          })));
          console.log(`⚠️ Still ${stillUnresolved.length} unresolved prerequisites - consider adding synonyms`);
        }
      },

      getOrCreateCourseByTitle: (title: string, seed?: Partial<PathNode["data"]>) => {
        const want = canonicalTitle(title);
        const wantSlug = slug(want);
        const existing = get().nodes.find(n => slug(n.data.title) === wantSlug);
        if (existing) return existing.id;
        
        // Try to find in catalog for better data
        const catalogMatch = canonicalCatalog.find(c => slug(c.title) === slug(want));
        
        const id = get().addNode({
          type: "course",
          position: { x: 0, y: 0 }, // will be laid out later
          data: {
            title: want,
            description: seed?.description ?? (catalogMatch ? `Covers: ${catalogMatch.skills.join(', ')}` : ''),
            skillTags: seed?.skillTags ?? catalogMatch?.skills ?? [want],
            difficulty: (seed?.difficulty as any) ?? catalogMatch?.difficulty ?? "beginner",
            status: "available",
            estimatedHours: seed?.estimatedHours ?? catalogMatch?.estimatedHours ?? 10,
            prerequisites: [],
          },
        });
        return id;
      },

      mergeDuplicateNodesByTitle: () => {
        const seen = new Map<string, string>(); // slug -> keepId
        const toRemove: string[] = [];
        const { nodes, edges } = get();
        
        nodes.forEach(n => {
          const key = slug(n.data.title);
          const keepId = seen.get(key);
          if (!keepId) { 
            seen.set(key, n.id); 
            return; 
          }
          
          // rewire edges from n.id -> keepId
          const newEdges = edges.map(e => ({
            ...e,
            source: e.source === n.id ? keepId : e.source,
            target: e.target === n.id ? keepId : e.target,
          }));
          
          // dedupe identical edges (same source+target+type)
          const uniq = new Map<string, typeof newEdges[0]>();
          newEdges.forEach(e => { 
            uniq.set(`${e.type}:${e.source}->${e.target}`, e); 
          });
          
          set({ edges: Array.from(uniq.values()) });
          toRemove.push(n.id);
        });
        
        toRemove.forEach(id => get().removeNode(id));
        
        // Safe cleanup of activeNode if it was removed
        const { activeNodeId } = get();
        if (activeNodeId && toRemove.includes(activeNodeId)) {
          set({ activeNodeId: undefined });
        }
      },

      clearCanvas: () => {
        set({
          nodes: [],
          edges: [],
          activeNodeId: undefined,
          selectedEdgeType: 'sequence',
          isDirty: true,
        });
      },
    }),
    {
      name: 'path-canvas-v1',
    }
  )
);

// Helper function for edge styling
const getEdgeStyle = (edgeType: PathEdge['type']) => {
  switch (edgeType) {
    case 'prerequisite':
      return { stroke: 'hsl(var(--destructive))', strokeWidth: 2 };
    case 'suggested':
      return { stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5,5' };
    case 'alternative':
      return { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '2,2' };
    case 'sequence':
      return { stroke: 'hsl(var(--border))', strokeWidth: 2 };
    case 'branch':
      return { stroke: 'hsl(var(--accent))', strokeWidth: 2 };
    default:
      return { stroke: 'hsl(var(--border))', strokeWidth: 2 };
  }
};
