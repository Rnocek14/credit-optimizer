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
  { title: 'Node.js Essentials', skills: ['node.js', 'javascript', 'backend'], difficulty: 'intermediate', estimatedHours: 25 },
  { title: 'Python Programming', skills: ['python', 'programming'], difficulty: 'beginner', estimatedHours: 25 },
  { title: 'Data Structures & Algorithms', skills: ['algorithms', 'data structures', 'programming'], difficulty: 'intermediate', estimatedHours: 40 },
  { title: 'SQL Database Fundamentals', skills: ['sql', 'databases'], difficulty: 'beginner', estimatedHours: 20 },
  { title: 'Git Version Control', skills: ['git', 'version control'], difficulty: 'beginner', estimatedHours: 10 },
  { title: 'TypeScript Fundamentals', skills: ['typescript', 'javascript'], difficulty: 'intermediate', estimatedHours: 15 },
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

          if (have.has(wantSlug)) continue;
          const completedNode = nodes.find(n => slug(n.data.title) === wantSlug && n.data.status === 'completed');
          if (completedNode) continue;

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

      autoLayoutTree: (orientation: "LR" | "TB" = "LR") => {
        const { nodes, edges } = get();
        const prereqEdges = edges.filter(e => e.type === 'prerequisite');

        // Build DAG
        const adj = new Map<string, Set<string>>();
        const indeg = new Map<string, number>();
        nodes.forEach(n => { adj.set(n.id, new Set()); indeg.set(n.id, 0); });
        prereqEdges.forEach(e => {
          adj.get(e.source)?.add(e.target);
          indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
        });

        // Kahn levels
        const levels: string[][] = [];
        const q: string[] = [];
        const levelOf = new Map<string, number>();

        nodes.forEach(n => {
          if ((indeg.get(n.id) || 0) === 0) { q.push(n.id); levelOf.set(n.id, 0); }
        });

        while (q.length) {
          const size = q.length;
          const layer: string[] = [];
          for (let i = 0; i < size; i++) {
            const u = q.shift()!;
            layer.push(u);
            for (const v of (adj.get(u) || [])) {
              indeg.set(v, (indeg.get(v) || 0) - 1);
              if ((indeg.get(v) || 0) === 0) {
                levelOf.set(v, (levelOf.get(u) || 0) + 1);
                q.push(v);
              }
            }
          }
          if (layer.length) levels.push(layer);
        }

        // Fallback: if cycles -> keep everything on level 0 to avoid NaN
        if (levels.length === 0) levels.push(nodes.map(n => n.id));

        // Layout constants
        const XG = 300, YG = 160, PADX = 80, PADY = 80;

        // Order nodes within a level by (average parent y, then title)
        const parentsOf = (id: string) => prereqEdges.filter(e => e.target === id).map(e => e.source);

        const orderedLevels = levels.map(layer => {
          return [...layer].sort((a, b) => {
            const pa = parentsOf(a).map(pid => nodes.find(n => n.id === pid)?.position.y ?? 0);
            const pb = parentsOf(b).map(pid => nodes.find(n => n.id === pid)?.position.y ?? 0);
            const ya = pa.length ? pa.reduce((s,v)=>s+v,0) / pa.length : 0;
            const yb = pb.length ? pb.reduce((s,v)=>s+v,0) / pb.length : 0;
            if (ya !== yb) return ya - yb;
            const ta = (nodes.find(n => n.id === a)?.data.title || "");
            const tb = (nodes.find(n => n.id === b)?.data.title || "");
            return ta.localeCompare(tb);
          });
        });

        const updated = nodes.map(n => {
          const L = levelOf.get(n.id) ?? 0;
          const layer = orderedLevels[L] || [];
          const i = Math.max(orderedLevels[L]?.indexOf(n.id) ?? -1, 0);

          if (orientation === "LR") {
            return {
              ...n,
              position: {
                x: PADX + L * XG,
                y: PADY + i * YG,
              },
            };
          } else {
            return {
              ...n,
              position: {
                x: PADX + i * XG,
                y: PADY + L * YG,
              },
            };
          }
        });

        set({ nodes: updated });
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
        await get().refreshUserSkills();

        const { getOrCreateCourseByTitle, connect, validatePrerequisites, setNodeStatus, revalidateAllStatuses, mergeDuplicateNodesByTitle, autoLayoutTree, userSkills } = get();

        let changed = true;
        let guard = 0;

        while (changed && guard++ < 20) {
          changed = false;

          for (const target of get().nodes) {
            const { ok, missing } = validatePrerequisites(target.id);
            if (ok || missing.length === 0) continue;

            for (const raw of missing) {
              const want = canonicalTitle(raw);
              const srcId = getOrCreateCourseByTitle(want);

              const already = get().edges.some(e => e.type === 'prerequisite' && e.source === srcId && e.target === target.id);
              if (!already) {
                connect(srcId, target.id, 'prerequisite');
                const v2 = validatePrerequisites(target.id);
                setNodeStatus(target.id, v2.ok ? 'available' : 'locked');
                changed = true;
              }

              // Smart-complete if user already has matching skills
              const created = get().nodes.find(n => n.id === srcId);
              const skills = created?.data?.skillTags || [];
              const hasRelevant = skills.some(s => userSkills.some(u => slug(u) === slug(s)));
              if (hasRelevant && created?.data.status !== 'completed') {
                setNodeStatus(srcId, 'completed');
                const v3 = validatePrerequisites(target.id);
                setNodeStatus(target.id, v3.ok ? 'available' : 'locked');
              }
            }
          }
        }

        mergeDuplicateNodesByTitle();
        revalidateAllStatuses();
        autoLayoutTree('LR');
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
