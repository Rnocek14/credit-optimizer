// tracks.ts
export type TrackId = 'web' | 'data' | 'systems';

export const TRACKS: Record<TrackId, { name: string; nodes: string[] }> = {
  web: {
    name: 'Web Frontend',
    nodes: ['b101','b201','b202','b301','b311','degree-completion'],
  },
  data: {
    name: 'Data Analytics', 
    nodes: ['b102','b201','b202','b302','b321','degree-completion'],
  },
  systems: {
    name: 'Systems & DevOps',
    nodes: ['b401','b201','b202','b331','degree-completion'],
  },
};