/**
 * 60-node seed data for V4 testing
 * Simulates 4-year plan with transfer credits and prerequisites
 */

import { PlanNode, PlanEdge, NodeType, EdgeType, V4GraphData } from '../types/v4';

export const seed60NodePlan: V4GraphData = {
  nodes: [
    // Spine: Year nodes
    { id: 'year1', type: NodeType.Year, position: { x: 0, y: 0 }, 
      data: { label: 'Year 1' }, className: 'spine-node' },
    { id: 'year2', type: NodeType.Year, position: { x: 400, y: 0 }, 
      data: { label: 'Year 2' }, className: 'spine-node' },
    { id: 'year3', type: NodeType.Year, position: { x: 800, y: 0 }, 
      data: { label: 'Year 3' }, className: 'spine-node' },
    { id: 'year4', type: NodeType.Year, position: { x: 1200, y: 0 }, 
      data: { label: 'Year 4' }, className: 'spine-node' },
    
    // Year 1 courses
    { id: 'CS101', type: NodeType.Course, position: { x: 0, y: 100 },
      data: { 
        label: 'CS 101', 
        credits: 3, 
        status: 'completed', 
        year: 1,
        skillTags: ['programming', 'python', 'computer-science'],
        difficulty: 'beginner',
        estimatedHours: 120,
      } 
    },
    { id: 'MATH151', type: NodeType.Course, position: { x: 0, y: 200 },
      data: { 
        label: 'MATH 151', 
        credits: 4, 
        status: 'completed', 
        year: 1, 
        transferable: true,
        skillTags: ['calculus', 'mathematics'],
        difficulty: 'intermediate',
        estimatedHours: 150,
      } 
    },
    { id: 'ENG101', type: NodeType.Course, position: { x: 0, y: 300 },
      data: { 
        label: 'ENG 101', 
        credits: 3, 
        status: 'completed', 
        year: 1,
        skillTags: ['writing', 'composition', 'english'],
        difficulty: 'beginner',
        estimatedHours: 100,
      } 
    },
    
    // Transfer equivalency for MATH151
    { id: 'MATH151_CLEP', type: NodeType.External, position: { x: -150, y: 200 },
      data: { label: 'CLEP Calculus', credits: 4, status: 'completed', source: 'exam' }, 
      className: 'external-node' },
    
    // Year 2 courses
    { id: 'CS201', type: NodeType.Course, position: { x: 400, y: 100 },
      data: { 
        label: 'CS 201', 
        credits: 3, 
        status: 'planned', 
        year: 2,
        skillTags: ['data-structures', 'algorithms', 'programming'],
        difficulty: 'intermediate',
        estimatedHours: 140,
      } 
    },
    { id: 'CS205', type: NodeType.Course, position: { x: 400, y: 200 },
      data: { 
        label: 'CS 205', 
        credits: 3, 
        status: 'planned', 
        year: 2,
        skillTags: ['software-engineering', 'programming'],
        difficulty: 'intermediate',
        estimatedHours: 130,
      } 
    },
    { id: 'MATH251', type: NodeType.Course, position: { x: 400, y: 300 },
      data: { 
        label: 'MATH 251', 
        credits: 4, 
        status: 'planned', 
        year: 2,
        skillTags: ['calculus', 'mathematics', 'linear-algebra'],
        difficulty: 'intermediate',
        estimatedHours: 160,
      } 
    },
    
    // Year 3 courses
    { id: 'CS301', type: NodeType.Course, position: { x: 800, y: 100 },
      data: { 
        label: 'CS 301', 
        credits: 3, 
        status: 'unplanned', 
        year: 3, 
        critical: true,
        skillTags: ['database', 'sql', 'data-management'],
        difficulty: 'advanced',
        estimatedHours: 150,
      } 
    },
    { id: 'CS310', type: NodeType.Course, position: { x: 800, y: 200 },
      data: { 
        label: 'CS 310', 
        credits: 3, 
        status: 'unplanned', 
        year: 3,
        skillTags: ['operating-systems', 'computer-architecture'],
        difficulty: 'advanced',
        estimatedHours: 160,
      } 
    },
    
    // Elective requirement bundle
    { id: 'ELEC_REQ', type: NodeType.Requirement, position: { x: 800, y: 350 },
      data: { label: 'Technical Elective (Choose 1)', status: 'unplanned' }, 
      className: 'bundle-node' },
    { id: 'CS320', type: NodeType.Course, position: { x: 700, y: 450 },
      data: { label: 'CS 320', credits: 3, status: 'unplanned', year: 3 } },
    { id: 'CS340', type: NodeType.Course, position: { x: 900, y: 450 },
      data: { label: 'CS 340', credits: 3, status: 'unplanned', year: 3 } },
    
    // Year 4 courses
    { id: 'CS401', type: NodeType.Course, position: { x: 1200, y: 100 },
      data: { label: 'CS 401 Capstone', credits: 3, status: 'unplanned', year: 4, residencyRequired: true } },
    
    // Plan B: Ghost nodes (alternatives shown in Compare overlay)
    { id: 'CS305_GHOST', type: NodeType.Course, position: { x: 800, y: 150 },
      data: { label: 'CS 305', credits: 3, status: 'unplanned', year: 3, alternativeFor: 'CS 301' }, 
      className: 'ghost-node hidden' },
    { id: 'CS202_GHOST', type: NodeType.Course, position: { x: 400, y: 150 },
      data: { label: 'CS 202', credits: 3, status: 'planned', year: 2, alternativeFor: 'CS 201' }, 
      className: 'ghost-node hidden' },
  ],
  
  edges: [
    // Spine sequence
    { id: 'e-y1-y2', source: 'year1', target: 'year2', type: EdgeType.Sequence, className: 'spine-edge' },
    { id: 'e-y2-y3', source: 'year2', target: 'year3', type: EdgeType.Sequence, className: 'spine-edge' },
    { id: 'e-y3-y4', source: 'year3', target: 'year4', type: EdgeType.Sequence, className: 'spine-edge' },
    
    // Prerequisites
    { id: 'e-CS101-CS201', source: 'CS101', target: 'CS201', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS201-CS301', source: 'CS201', target: 'CS301', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-MATH151-MATH251', source: 'MATH151', target: 'MATH251', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS205-CS310', source: 'CS205', target: 'CS310', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS301-CS401', source: 'CS301', target: 'CS401', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    
    // Transfer equivalency (hidden by default)
    { id: 'e-CLEP-MATH151', source: 'MATH151_CLEP', target: 'MATH151', type: EdgeType.Equivalency, 
      className: 'equiv-edge hidden', hidden: true },
    
    // Elective fulfillment
    { id: 'e-CS320-ELEC', source: 'CS320', target: 'ELEC_REQ', type: EdgeType.Fulfills, className: 'fulfill-edge' },
    { id: 'e-CS340-ELEC', source: 'CS340', target: 'ELEC_REQ', type: EdgeType.Fulfills, className: 'fulfill-edge' },
    
    // Compare edges (Plan A → Plan B alternatives, hidden by default)
    { id: 'e-CS301-CS305', source: 'CS301', target: 'CS305_GHOST', type: EdgeType.Equivalency, 
      className: 'compare-edge hidden', hidden: true },
    { id: 'e-CS201-CS202', source: 'CS201', target: 'CS202_GHOST', type: EdgeType.Equivalency, 
      className: 'compare-edge hidden', hidden: true },
  ]
};
