// tracks.ts
export type TrackId = 'web' | 'data' | 'systems';

export const TRACKS: Record<TrackId, { name: string; nodes: string[]; sharedNodes: string[]; branchingPoint: string }> = {
  web: {
    name: 'Web Frontend',
    nodes: ['b101','b201','b202','b301','b311','degree-completion'],
    sharedNodes: ['b101','b201','b202','degree-completion'], // shared foundation + convergence
    branchingPoint: 'b202', // where tracks diverge
  },
  data: {
    name: 'Data Analytics', 
    nodes: ['b102','b201','b202','b302','b321','degree-completion'],
    sharedNodes: ['b102','b201','b202','degree-completion'], // shared foundation + convergence
    branchingPoint: 'b202', // where tracks diverge
  },
  systems: {
    name: 'Systems & DevOps',
    nodes: ['b401','b201','b202','b331','degree-completion'],
    sharedNodes: ['b401','b201','b202','degree-completion'], // shared foundation + convergence
    branchingPoint: 'b202', // where tracks diverge
  },
};