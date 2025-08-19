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

const TITLE_SYNONYMS: Record<string, string> = {
  js: "JavaScript Basics",
  javascript: "JavaScript Basics",
  "html css": "HTML & CSS Foundations",
  html: "HTML & CSS Foundations",
  css: "HTML & CSS Foundations",
  ts: "TypeScript Fundamentals",
  typescript: "TypeScript Fundamentals",
  node: "Node.js Essentials",
  "nodejs": "Node.js Essentials",
  "node.js": "Node.js Essentials",
  express: "Express.js Framework",
  react: "React Fundamentals",
  "react hooks": "React Hooks & Advanced State",
  "react patterns": "Advanced React Patterns",
  "advanced react": "Advanced React Patterns",
  "advanced react patterns": "Advanced React Patterns",
  rest: "REST API Design",
  api: "API Development",
  sql: "SQL Database Fundamentals",
  database: "SQL Database Fundamentals",
  python: "Python Programming",
  algorithms: "Data Structures & Algorithms",
  "data structures": "Data Structures & Algorithms",
  git: "Git Version Control",
};

const canonicalTitle = (label: string) => {
  const s = slug(label);
  // direct hit
  if (TITLE_SYNONYMS[s]) return TITLE_SYNONYMS[s];
  // compound synonym for "html css"
  if (s.includes('html') && s.includes('css')) return 'HTML & CSS Foundations';
  return label.trim();
};

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
  { title: 'React Hooks & Advanced State', skills: ['react', 'hooks', 'useReducer', 'useMemo', 'context'], difficulty: 'intermediate', estimatedHours: 16 },
  { title: 'Patterns & Composition in React', skills: ['react', 'composition', 'render props', 'compound components', 'children as a function'], difficulty: 'intermediate', estimatedHours: 14 },
  { title: 'React Performance & Optimization', skills: ['react', 'performance', 'memoization', 'profiling', 'concurrency'], difficulty: 'advanced', estimatedHours: 12 },
  { title: 'Advanced React Patterns', skills: ['react', 'patterns', 'composition', 'performance'], difficulty: 'advanced', estimatedHours: 20 },
  { title: 'Node.js Essentials', skills: ['node.js', 'javascript', 'backend'], difficulty: 'intermediate', estimatedHours: 25 },
  { title: 'Python Programming', skills: ['python', 'programming'], difficulty: 'beginner', estimatedHours: 25 },
  { title: 'Data Structures & Algorithms', skills: ['algorithms', 'data structures', 'programming'], difficulty: 'intermediate', estimatedHours: 40 },
  { title: 'SQL Database Fundamentals', skills: ['sql', 'databases'], difficulty: 'beginner', estimatedHours: 20 },
  { title: 'Git Version Control', skills: ['git', 'version control'], difficulty: 'beginner', estimatedHours: 10 },
  { title: 'TypeScript Fundamentals', skills: ['typescript', 'javascript'], difficulty: 'intermediate', estimatedHours: 15 },
  { title: 'API Development', skills: ['api', 'rest', 'backend'], difficulty: 'intermediate', estimatedHours: 30 },
];

export interface PathNode extends Node {
  type: 'track' | 'course' | 'project' | 'milestone' | 'skill';
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

  // Layout constants for tidy tree layout
  NODE_W: number;
  NODE_H: number;
  H_GAP: number;
  V_GAP: number;
  PADX: number;
  PADY: number;

  // Layout guards and scheduling
  isLayingOut: boolean;
  layoutVersion: number;
  pendingLayout: boolean;
  layoutDebounceId?: number | null;
  dimensionSig: string;
  layoutSuspended: number;

  // Layout helpers
  getNodeSize: (id: string) => { w: number; h: number };
  scheduleLayout: (reason?: string) => void;
  recomputeDimensionSig: () => string;
  suspendLayout: () => void;
  resumeLayout: () => void;
  validateNoOverlap: () => void;

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
  ensurePrerequisiteClosure: () => Promise<void>;
  getOrCreateCourseByTitle: (title: string, seed?: Partial<PathNode["data"]>) => string;
  mergeDuplicateNodesByTitle: () => void;
  revalidateAllStatuses: () => void;
  
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

      // Layout constants and guards
      NODE_W: 280,
      NODE_H: 132,
      H_GAP: 160,
      V_GAP: 80,
      PADX: 80,
      PADY: 80,
      isLayingOut: false,
      layoutVersion: 0,
      pendingLayout: false,
      layoutDebounceId: null,
      dimensionSig: "",
      layoutSuspended: 0,

      // Safely read measured size from React Flow (if present), else fallback
      getNodeSize: (id: string) => {
        const n = get().nodes.find(x => x.id === id);
        // Use measured dimensions first, then fallbacks based on node type
        const measuredW = (n as any)?.measured?.width ?? (n as any)?.width;
        const measuredH = (n as any)?.measured?.height ?? (n as any)?.height;
        
        // Skill nodes are smaller - guard against 0x0 dimensions
        if (n?.type === 'skill') {
          return { 
            w: measuredW && measuredW > 0 ? measuredW : 200,
            h: measuredH && measuredH > 0 ? measuredH : 40 
          };
        }
        
        return { 
          w: measuredW && measuredW > 0 ? measuredW : get().NODE_W,
          h: measuredH && measuredH > 0 ? measuredH : get().NODE_H 
        };
      },

      recomputeDimensionSig: () => {
        // Build a compact signature of id|w|h using measured dimensions first
        const parts = get().nodes.map(n => {
          const w = (n as any)?.measured?.width ?? (n as any)?.width ?? get().NODE_W;
          const h = (n as any)?.measured?.height ?? (n as any)?.height ?? get().NODE_H;
          return `${n.id}:${Math.round(w)}x${Math.round(h)}`;
        }).sort();
        return parts.join("|");
      },

      // Suspend/Resume helpers for bulk mutations
      suspendLayout: () => set(s => ({ layoutSuspended: s.layoutSuspended + 1 })),
      resumeLayout: () => set(s => ({ layoutSuspended: Math.max(0, s.layoutSuspended - 1) })),

      scheduleLayout: (reason) => {
        const S = get();
        if (S.layoutSuspended > 0) return;     // don't layout mid-transaction
        if (S.pendingLayout) return;            // coalesce
        set({ pendingLayout: true });

        // Two rAFs: let DOM paint & React Flow write measured sizes
        const run = () => {
          const sig = get().recomputeDimensionSig();
          set({ dimensionSig: sig });
          get().autoLayoutTree('LR');
          set({ pendingLayout: false });
        };

        if (get().layoutDebounceId) cancelAnimationFrame(get().layoutDebounceId!);
        const id = requestAnimationFrame(() => requestAnimationFrame(run));
        set({ layoutDebounceId: id });
      },

      validateNoOverlap: () => {
        const { nodes } = get();
        const boxes = nodes.map(n => ({
          id: n.id,
          x: n.position?.x ?? 0,
          y: n.position?.y ?? 0,
          w: (n as any)?.measured?.width ?? (n as any)?.width ?? get().NODE_W,
          h: (n as any)?.measured?.height ?? (n as any)?.height ?? get().NODE_H,
        }));
        const hits: Array<[string,string]> = [];
        for (let i=0;i<boxes.length;i++){
          for (let j=i+1;j<boxes.length;j++){
            const A = boxes[i], B = boxes[j];
            const overlap = !(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y);
            if (overlap) hits.push([A.id, B.id]);
          }
        }
        if (hits.length) console.warn('🔴 Overlaps detected:', hits.slice(0,10));
        else console.info('🟢 No overlaps');
      },

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
        
        if (get().layoutSuspended === 0) get().scheduleLayout("node added");
        
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
        
        get().scheduleLayout("node removed");
      },

      connect: (sourceId, targetId, edgeType) => {
        const { selectedEdgeType } = get();
        const finalEdgeType = edgeType || selectedEdgeType;

        if (sourceId === targetId) return;

        const key = `${finalEdgeType}:${sourceId}->${targetId}`;
        const dup = get().edges.some(e => `${e.type}:${e.source}->${e.target}` === key);
        if (dup) return;
        
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
        
        if (get().layoutSuspended === 0) get().scheduleLayout("edge added");
        
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
        
        get().scheduleLayout("edge removed");

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

        // 1) what the user "has"
        const have = new Set((userSkills || []).map(slug));
        nodes
          .filter(n => n.data.status === 'completed')
          .forEach(n => {
            if (n.data.title) have.add(slug(n.data.title));
            (n.data.skillTags || []).forEach(s => have.add(slug(s)));
          });

        const missing: string[] = [];

        // 2) node-based prerequisites (must be completed)
        const prereqEdges = edges.filter(e => e.type === 'prerequisite' && e.target === id);
        prereqEdges.forEach(e => {
          const src = nodes.find(n => n.id === e.source);
          if (!src || src.data.status !== 'completed') {
            missing.push(src?.data.title || e.source);
          }
        });

        // 3) free-text skill/title prerequisites
        const reqs = node.data.prerequisites || [];
        for (const raw of reqs) {
          const want = canonicalTitle(raw);
          const wantSlug = slug(want);

          // (A) satisfied by user skills?
          if (have.has(wantSlug)) continue;

          // (B) satisfied by any COMPLETED node title?
          const completedNode = nodes.find(n => slug(n.data.title) === wantSlug && n.data.status === 'completed');
          if (completedNode) continue;

          // (C) satisfied by any COMPLETED node skills?
          const completedHasSkill = nodes.some(n =>
            n.data.status === 'completed' &&
            (n.data.skillTags || []).some(s => slug(s) === wantSlug)
          );
          if (completedHasSkill) continue;

          // still missing (avoid dup strings)
          if (!missing.some(m => slug(m) === wantSlug)) {
            missing.push(want);
          }
        }

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

      // Layout constants for tidy tree layout
      // (moved to initial state above)

      autoLayoutTree: (orientation: "LR" | "TB" = "LR") => {
        // Layout guard
        if (get().isLayingOut) return;
        set({ isLayingOut: true, layoutVersion: get().layoutVersion + 1 });

        try {
          const S = get(); // constants + helpers
          const { nodes, edges } = get();
          const prereq = edges.filter(e => e.type === "prerequisite");

          // Graph
          const byId      = new Map(nodes.map(n => [n.id, n]));
          const parents   = new Map<string, string[]>();
          const children  = new Map<string, string[]>();
          const indeg     = new Map<string, number>();
          nodes.forEach(n => { parents.set(n.id, []); children.set(n.id, []); indeg.set(n.id, 0); });
          prereq.forEach(e => {
            children.get(e.source)!.push(e.target);
            parents.get(e.target)!.push(e.source);
            indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
          });

          // Ranks (longest path)
          const rank = new Map<string, number>();
          const q: string[] = [];
          nodes.forEach(n => { if ((indeg.get(n.id) || 0) === 0) { rank.set(n.id, 0); q.push(n.id); }});
          while (q.length) {
            const u = q.shift()!, ru = rank.get(u) || 0;
            for (const v of children.get(u)!) {
              rank.set(v, Math.max(ru + 1, rank.get(v) ?? 0));
              indeg.set(v, (indeg.get(v) || 0) - 1);
              if ((indeg.get(v) || 0) === 0) q.push(v);
            }
          }
          if (rank.size === 0) nodes.forEach(n => rank.set(n.id, 0));

          // Sort children for stability (barycenter of parents, diff, title)
          const diffOrder: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
          const getH = (id: string) => S.getNodeSize(id).h;
          const getW = (id: string) => S.getNodeSize(id).w;

          // We'll fill 'center' progressively as we place; parents' centers known before children
          const centerY = new Map<string, number>();
          const centerOf = (id: string) => centerY.get(id) ?? (S.PADY + getH(id) / 2);
          const avgParentCenter = (id: string) => {
            const ps = parents.get(id)!; if (!ps.length) return S.PADY + getH(id)/2;
            const sum = ps.reduce((a,p) => a + centerOf(p), 0);
            return sum / ps.length;
          };

          // x by rank using measured max width
          const ranks = Array.from(new Set(Array.from(rank.values()))).sort((a,b)=>a-b);
          const maxW: Record<number, number> = {};
          for (const r of ranks) {
            maxW[r] = Math.max(S.NODE_W, ...nodes.filter(n => (rank.get(n.id)||0)===r).map(n => getW(n.id)));
          }
          const xOf: Record<number, number> = {};
          xOf[ranks[0] ?? 0] = S.PADX;
          for (let i=1;i<ranks.length;i++) {
            xOf[ranks[i]] = xOf[ranks[i-1]] + (maxW[ranks[i-1]] ?? S.NODE_W) + S.H_GAP;
          }

          // Subtree height in pixels (includes V_GAP between children)
          const subtreeH = new Map<string, number>();
          const kidsOf = (id: string) => children.get(id)!;
          const dynGap = S.V_GAP; // can make adaptive if desired

          const post = (id: string): number => {
            const ks = kidsOf(id);
            if (!ks.length) { const h = getH(id); subtreeH.set(id, h); return h; }
            // order children before measuring, for consistent blocks
            ks.sort((a,b) => {
              const ba = avgParentCenter(a), bb = avgParentCenter(b);
              if (ba !== bb) return ba - bb;
              const da = diffOrder[byId.get(a)?.data?.difficulty ?? 'intermediate'] ?? 1;
              const db = diffOrder[byId.get(b)?.data?.difficulty ?? 'intermediate'] ?? 1;
              if (da !== db) return da - db;
              const ta = (byId.get(a)?.data?.title || ''), tb = (byId.get(b)?.data?.title || '');
              return ta.localeCompare(tb);
            });
            let sum = 0;
            ks.forEach((k,i) => {
              const sh = post(k);
              sum += sh + (i>0 ? dynGap : 0);
            });
            sum = Math.max(sum, getH(id));   // ensure parent's own card fits its block
            subtreeH.set(id, sum);
            return sum;
          };

          // Kick off from all roots (rank 0)
          const roots = nodes.filter(n => (rank.get(n.id)||0)===0).map(n => n.id);
          roots.forEach(post);

          // Placement: each node gets a top Y = current blockTop; parent is centered in its block
          const pos = new Map<string, {x:number;y:number}>();

          const place = (id: string, r: number, blockTop: number) => {
            const x = xOf[r] ?? S.PADX;
            const myH = getH(id);
            const myBlock = subtreeH.get(id)!;
            const y = blockTop + Math.max(0, (myBlock - myH)/2); // center parent in its block
            pos.set(id, { x, y });
            centerY.set(id, y + myH/2);

            // Place children in contiguous blocks directly under this parent
            let childTop = blockTop;
            const ks = kidsOf(id);
            ks.forEach((k, i) => {
              place(k, r+1, childTop);
              childTop += subtreeH.get(k)! + (i < ks.length-1 ? dynGap : 0);
            });
          };

          // Multi-root packing: stack root blocks with gaps
          let rootTop = S.PADY;
          roots.forEach((root, i) => {
            place(root, 0, rootTop);
            rootTop += subtreeH.get(root)! + (i < roots.length-1 ? S.V_GAP*1.5 : 0);
          });

          // Safety: per-rank collision sweep (should be no-ops now)
          const byRank: Record<number,string[]> = {};
          nodes.forEach(n => { const r = rank.get(n.id)||0; (byRank[r] ??= []).push(n.id); });
          Object.keys(byRank).map(Number).sort((a,b)=>a-b).forEach(r => {
            const list = byRank[r].slice().sort((a,b)=> (pos.get(a)!.y - pos.get(b)!.y));
            for (let i=1;i<list.length;i++){
              const prev = list[i-1], cur = list[i];
              const minTop = pos.get(prev)!.y + getH(prev) + S.V_GAP;
              if (pos.get(cur)!.y < minTop) pos.set(cur, { x: pos.get(cur)!.x, y: minTop });
            }
          });

          // Orientation
          const finalNodes = nodes.map(n => {
            const p = pos.get(n.id) ?? { x: S.PADX, y: S.PADY };
            return orientation === 'LR' ? { ...n, position: p } : { ...n, position: { x: p.y, y: p.x }};
          });
          set({ nodes: finalNodes });

        } finally {
          set({ isLayingOut: false });
          setTimeout(() => window.postMessage({ type: "TREE_LAYOUT_COMPLETE" }, "*"), 50);
        }
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
        const { suspendLayout, resumeLayout, scheduleLayout } = get();
        suspendLayout();
        try {
          await get().refreshUserSkills();

          // --- Targeted repair for "Advanced React Patterns" ---
          const arNode = get().nodes.find(n => slug(n.data.title) === slug("Advanced React Patterns"));
          if (arNode) {
            const mustHave = [
              "React Hooks & Advanced State",
              "Patterns & Composition in React", 
              "React Performance & Optimization",
            ];
            const current = new Set((arNode.data.prerequisites || []).map(slug));
            const fixed = [...new Set([...Array.from(current), ...mustHave.map(slug)])];
            if (fixed.length !== current.size) {
              get().setPrerequisites(arNode.id, mustHave);
            }
          }

          const { getOrCreateCourseByTitle, connect, validatePrerequisites, setNodeStatus, revalidateAllStatuses, mergeDuplicateNodesByTitle, addNode, userSkills } = get();

          let changed = true;
          let guard = 0;

          while (changed && guard++ < 20) {
            changed = false;

            for (const target of get().nodes) {
              const { ok, missing } = validatePrerequisites(target.id);
              if (ok || missing.length === 0) continue;

              for (const raw of missing) {
                const desired = canonicalTitle(raw);
                const key = slug(desired);

                // Always create visual connections - even when user has the skill
                if (get().userSkills.some(s => slug(s) === key)) {
                  let src = get().nodes.find(n => slug(n.data.title) === key);
                  
                  if (!src) {
                    // Create a compact skill node for user-satisfied prerequisites
                    const sid = addNode({
                      type: 'skill',
                      position: { x: 0, y: 0 }, // will be laid out later
                      data: {
                        title: desired,
                        description: 'Satisfied via prior experience',
                        skillTags: [raw],
                        difficulty: 'beginner' as const,
                        status: 'completed' as const,
                        prerequisites: [],
                        estimatedHours: 0,
                      }
                    });
                    src = get().nodes.find(n => n.id === sid)!;
                  } else if (src.data.status !== 'completed') {
                    setNodeStatus(src.id, 'completed');
                  }

                  // Always create the visual connection
                  const already = get().edges.some(e => e.type === 'prerequisite' && e.source === src!.id && e.target === target.id);
                  if (!already) {
                    connect(src.id, target.id, 'prerequisite');
                    changed = true;
                  }
                  continue;
                }

                // Otherwise create or get the course node
                const srcId = getOrCreateCourseByTitle(desired);

                // Connect as a prerequisite if not already connected
                const exists = get().edges.some(e => e.type === 'prerequisite' && e.source === srcId && e.target === target.id);
                if (!exists) {
                  connect(srcId, target.id, 'prerequisite');
                  changed = true;
                }

                // Smart complete created node if user has overlapping skills (partial match)
                const created = get().nodes.find(n => n.id === srcId);
                const skills = created?.data?.skillTags || [];
                const hasRelevant = skills.some(s => get().userSkills.some(u => slug(u) === slug(s)));
                if (hasRelevant && created?.data.status !== 'completed') {
                  setNodeStatus(srcId, 'completed');
                }
              }
            }
          }

          // Order: merge duplicates first, then explicit connections
          mergeDuplicateNodesByTitle();

          // Explicitly connect "Advanced React Patterns" after merging to ensure correct IDs
          const arpAfterMerge = get().nodes.find(n => slug(n.data.title) === slug('Advanced React Patterns'));
          if (arpAfterMerge) {
            const prereqs = [
              'React Hooks & Advanced State',
              'Patterns & Composition in React',
              'React Performance & Optimization',
            ];
            for (const p of prereqs) {
              const pid = getOrCreateCourseByTitle(p);
              const connected = get().edges.some(e => e.type === 'prerequisite' && e.source === pid && e.target === arpAfterMerge.id);
              if (!connected) {
                connect(pid, arpAfterMerge.id, 'prerequisite');
              }
            }
          }

          revalidateAllStatuses();
        } finally {
          resumeLayout();
        }
        scheduleLayout('post auto-fill');
      },

      getOrCreateCourseByTitle: (title: string, seed?: Partial<PathNode['data']>) => {
        const want = canonicalTitle(title);
        const key = slug(want);

        const existing = get().nodes.find(n => slug(n.data.title) === key);
        if (existing) return existing.id;

        const catalog = (globalThis as any).canonicalCatalog as Array<{
          title: string;
          skills: string[];
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          estimatedHours: number;
        }> | undefined;

        const match = catalog?.find(c => slug(c.title) === key);

        const id = get().addNode({
          type: 'course',
          position: { x: 0, y: 0 }, // laid out later
          data: {
            title: want,
            description: seed?.description ?? (match ? `Covers: ${match.skills.join(', ')}` : ''),
            skillTags: seed?.skillTags ?? match?.skills ?? [want],
            difficulty: (seed?.difficulty as any) ?? match?.difficulty ?? 'beginner',
            status: 'available',
            estimatedHours: seed?.estimatedHours ?? match?.estimatedHours ?? 10,
            prerequisites: [],
          },
        });

        return id;
      },

      mergeDuplicateNodesByTitle: () => {
        const { nodes, edges } = get();
        const seen = new Map<string, string>(); // slug -> keepId
        const toDelete: string[] = [];

        // Choose the "kept" node per canonical title
        for (const n of nodes) {
          const key = slug(n.data.title);
          if (!seen.has(key)) {
            seen.set(key, n.id);
          } else {
            toDelete.push(n.id);
          }
        }

        if (toDelete.length === 0) return;

        // Rewire edges to the kept node
        let rewired = edges.map(e => ({
          ...e,
          source: toDelete.includes(e.source) ? seen.get(slug(nodes.find(n => n.id === e.source)!.data.title))! : e.source,
          target: toDelete.includes(e.target) ? seen.get(slug(nodes.find(n => n.id === e.target)!.data.title))! : e.target,
        }));

        // Deduplicate identical edges (type+source+target)
        const uniq = new Map<string, typeof rewired[number]>();
        for (const e of rewired) {
          uniq.set(`${e.type}:${e.source}->${e.target}`, e);
        }

        set({
          edges: Array.from(uniq.values()),
          nodes: nodes.filter(n => !toDelete.includes(n.id)),
          isDirty: true,
        });
      },

      revalidateAllStatuses: () => {
        const { nodes, validatePrerequisites, setNodeStatus } = get();
        for (const n of nodes) {
          if (n.data.status === 'completed') continue;
          const v = validatePrerequisites(n.id);
          setNodeStatus(n.id, v.ok ? 'available' : 'locked');
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
