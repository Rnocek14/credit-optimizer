import { V3Graph } from '../types/v3';

export const dummyGraph: V3Graph = {
  nodes: [
    { id: 'y1-core', type: 'requirement', data: { year: 1, programId: 'bs_cs', title: 'CS Core Y1' }, position: { x: 0, y: 0 } },
    { id: 'y2-core', type: 'requirement', data: { year: 2, programId: 'bs_cs', title: 'CS Core Y2' }, position: { x: 0, y: 0 } },
    { id: 'gate-track', type: 'gate', data: { year: 3, programId: 'bs_cs', title: 'Track Gate' }, position: { x: 0, y: 0 } },
    { id: 'y3-se-core', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'se', title: 'SE Core' }, position: { x: 0, y: 0 } },
    { id: 'y3-ds-core', type: 'requirement', data: { year: 3, programId: 'bs_cs', trackId: 'ds', title: 'DS Core' }, position: { x: 0, y: 0 } },
    { id: 'y4-cap', type: 'requirement', data: { year: 4, programId: 'bs_cs', title: 'Capstone' }, position: { x: 0, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'y1-core', target: 'y2-core', kind: 'prereq' },
    { id: 'e2', source: 'y2-core', target: 'gate-track', kind: 'gate' },
    { id: 'e3', source: 'gate-track', target: 'y3-se-core', kind: 'prereq' },
    { id: 'e4', source: 'gate-track', target: 'y3-ds-core', kind: 'prereq' },
    { id: 'e5', source: 'y3-se-core', target: 'y4-cap', kind: 'prereq' },
    { id: 'e6', source: 'y3-ds-core', target: 'y4-cap', kind: 'prereq' },
  ]
};
