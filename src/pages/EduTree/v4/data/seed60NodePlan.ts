/**
 * Full 4-year CS degree plan with 40+ courses
 * Total: 120 credits across all categories
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
    
    // ===== YEAR 1 (30 credits) =====
    // Fall Semester (15 cr)
    { id: 'CS101', type: NodeType.Course, position: { x: 0, y: 100 },
      data: { 
        label: 'CS101', 
        credits: 3, 
        category: 'coreCS',
        status: 'completed', 
        year: 1,
        semester: 'fall',
        moduleId: 'cs-foundations',
        skillTags: ['programming', 'python'],
        difficulty: 'beginner',
        estimatedHours: 120,
      } 
    },
    { id: 'MATH151', type: NodeType.Course, position: { x: 0, y: 200 },
      data: { 
        label: 'MATH 151 Calculus I', 
        credits: 4, 
        category: 'math',
        status: 'completed', 
        year: 1,
        semester: 'fall',
        moduleId: 'math-calculus',
        transferable: true,
        skillTags: ['calculus', 'mathematics'],
        difficulty: 'intermediate',
        estimatedHours: 150,
      } 
    },
    { id: 'ENG101', type: NodeType.Course, position: { x: 0, y: 300 },
      data: { 
        label: 'ENG 101 Composition I', 
        credits: 3, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'fall',
        moduleId: 'genEd-communication',
        skillTags: ['writing', 'composition'],
        difficulty: 'beginner',
        estimatedHours: 100,
      } 
    },
    { id: 'HIST101', type: NodeType.Course, position: { x: 0, y: 400 },
      data: { 
        label: 'HIST 101 World History', 
        credits: 3, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'fall',
        moduleId: 'genEd-humanities',
        skillTags: ['history', 'humanities'],
        difficulty: 'beginner',
        estimatedHours: 90,
      } 
    },
    { id: 'PE101', type: NodeType.Course, position: { x: 0, y: 500 },
      data: { 
        label: 'PE 101 Wellness', 
        credits: 2, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'fall',
        difficulty: 'beginner',
        estimatedHours: 40,
      } 
    },
    
    // Spring Semester (15 cr)
    { id: 'CS102', type: NodeType.Course, position: { x: 0, y: 100 },
      data: { 
        label: 'CS102', 
        credits: 3, 
        category: 'coreCS',
        status: 'completed', 
        year: 1,
        semester: 'spring',
        moduleId: 'cs-foundations',
        skillTags: ['logic', 'mathematics', 'proofs'],
        difficulty: 'intermediate',
        estimatedHours: 130,
      } 
    },
    { id: 'MATH152', type: NodeType.Course, position: { x: 0, y: 200 },
      data: { 
        label: 'MATH 152 Calculus II', 
        credits: 4, 
        category: 'math',
        status: 'completed', 
        year: 1,
        semester: 'spring',
        moduleId: 'math-calculus',
        skillTags: ['calculus', 'integration'],
        difficulty: 'intermediate',
        estimatedHours: 160,
      } 
    },
    { id: 'ENG102', type: NodeType.Course, position: { x: 0, y: 300 },
      data: { 
        label: 'ENG 102 Composition II', 
        credits: 3, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'spring',
        moduleId: 'genEd-communication',
        skillTags: ['writing', 'research'],
        difficulty: 'beginner',
        estimatedHours: 100,
      } 
    },
    { id: 'PHIL105', type: NodeType.Course, position: { x: 0, y: 400 },
      data: { 
        label: 'PHIL 105 Logic', 
        credits: 3, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'spring',
        moduleId: 'genEd-humanities',
        skillTags: ['logic', 'philosophy'],
        difficulty: 'intermediate',
        estimatedHours: 110,
      } 
    },
    { id: 'SPCH101', type: NodeType.Course, position: { x: 0, y: 500 },
      data: { 
        label: 'SPCH 101 Public Speaking', 
        credits: 2, 
        category: 'genEd',
        status: 'completed', 
        year: 1,
        semester: 'spring',
        moduleId: 'genEd-communication',
        difficulty: 'beginner',
        estimatedHours: 60,
      } 
    },
    
    // Transfer credit (CLEP)
    { id: 'MATH151_CLEP', type: NodeType.External, position: { x: 0, y: 0 },
      data: { 
        label: 'CLEP Calculus', 
        credits: 4, 
        category: 'transfer',
        status: 'completed', 
        source: 'exam',
        year: 1,
        semester: 'spring',
        transferable: true,
      }, 
      className: 'external-node' 
    },
    
    // ===== YEAR 2 (30 credits) =====
    // Fall Semester (16 cr)
    { id: 'CS201', type: NodeType.Course, position: { x: 400, y: 100 },
      data: { 
        label: 'CS201', 
        credits: 3, 
        category: 'coreCS',
        status: 'in-progress', 
        year: 2,
        semester: 'fall',
        moduleId: 'cs-foundations',
        skillTags: ['data-structures', 'algorithms'],
        difficulty: 'intermediate',
        estimatedHours: 140,
      } 
    },
    { id: 'MATH251', type: NodeType.Course, position: { x: 400, y: 200 },
      data: { 
        label: 'MATH 251 Linear Algebra', 
        credits: 4, 
        category: 'math',
        status: 'in-progress', 
        year: 2,
        semester: 'fall',
        moduleId: 'math-advanced',
        skillTags: ['linear-algebra', 'matrices'],
        difficulty: 'intermediate',
        estimatedHours: 160,
      } 
    },
    { id: 'PHYS211', type: NodeType.Course, position: { x: 400, y: 300 },
      data: { 
        label: 'PHYS 211 Physics I', 
        credits: 4, 
        category: 'math',
        status: 'in-progress', 
        year: 2,
        semester: 'fall',
        moduleId: 'math-science',
        skillTags: ['physics', 'mechanics'],
        difficulty: 'intermediate',
        estimatedHours: 150,
      } 
    },
    { id: 'SOC101', type: NodeType.Course, position: { x: 400, y: 400 },
      data: { 
        label: 'SOC 101 Sociology', 
        credits: 3, 
        category: 'genEd',
        status: 'in-progress', 
        year: 2,
        semester: 'fall',
        moduleId: 'genEd-social',
        skillTags: ['social-science'],
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'ART101', type: NodeType.Course, position: { x: 400, y: 500 },
      data: { 
        label: 'ART 101 Art History', 
        credits: 2, 
        category: 'genEd',
        status: 'in-progress', 
        year: 2,
        semester: 'fall',
        moduleId: 'genEd-humanities',
        difficulty: 'beginner',
        estimatedHours: 60,
      } 
    },
    
    // Spring Semester (14 cr)
    { id: 'CS202', type: NodeType.Course, position: { x: 400, y: 100 },
      data: { 
        label: 'CS202', 
        credits: 3, 
        category: 'coreCS',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        moduleId: 'cs-foundations',
        skillTags: ['software-engineering', 'design-patterns'],
        difficulty: 'intermediate',
        estimatedHours: 130,
      } 
    },
    { id: 'CS205', type: NodeType.Course, position: { x: 400, y: 100 },
      data: { 
        label: 'CS205', 
        credits: 3, 
        category: 'coreCS',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        moduleId: 'cs-foundations',
        skillTags: ['software-engineering', 'design-patterns'],
        difficulty: 'intermediate',
        estimatedHours: 130,
      } 
    },
    { id: 'STAT220', type: NodeType.Course, position: { x: 400, y: 200 },
      data: { 
        label: 'STAT 220 Statistics', 
        credits: 3, 
        category: 'math',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        moduleId: 'math-advanced',
        skillTags: ['statistics', 'probability'],
        difficulty: 'intermediate',
        estimatedHours: 120,
      } 
    },
    { id: 'PHYS212', type: NodeType.Course, position: { x: 400, y: 300 },
      data: { 
        label: 'PHYS 212 Physics II', 
        credits: 4, 
        category: 'math',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        moduleId: 'math-science',
        skillTags: ['physics', 'electromagnetism'],
        difficulty: 'intermediate',
        estimatedHours: 150,
      } 
    },
    { id: 'PSY101', type: NodeType.Course, position: { x: 400, y: 400 },
      data: { 
        label: 'PSY 101 Psychology', 
        credits: 3, 
        category: 'genEd',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        moduleId: 'genEd-social',
        skillTags: ['psychology'],
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'MUS101', type: NodeType.Course, position: { x: 400, y: 500 },
      data: { 
        label: 'MUS 101 Music Appreciation', 
        credits: 1, 
        category: 'genEd',
        status: 'planned', 
        year: 2,
        semester: 'spring',
        difficulty: 'beginner',
        estimatedHours: 40,
      } 
    },
    
    // ===== YEAR 3 (30 credits) =====
    // Fall Semester (15 cr)
    { id: 'CS301', type: NodeType.Course, position: { x: 800, y: 100 },
      data: { 
        label: 'CS 301 Databases', 
        credits: 3, 
        category: 'coreCS',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        moduleId: 'cs-systems',
        critical: true,
        skillTags: ['database', 'sql'],
        difficulty: 'advanced',
        estimatedHours: 150,
      } 
    },
    { id: 'CS305', type: NodeType.Course, position: { x: 800, y: 200 },
      data: { 
        label: 'CS 305 Computer Arch', 
        credits: 3, 
        category: 'coreCS',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        moduleId: 'cs-systems',
        skillTags: ['computer-architecture', 'assembly'],
        difficulty: 'advanced',
        estimatedHours: 140,
      } 
    },
    { id: 'CS320', type: NodeType.Course, position: { x: 800, y: 300 },
      data: { 
        label: 'CS 320 Web Dev', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        moduleId: 'elective-upper',
        skillTags: ['web-development', 'javascript'],
        difficulty: 'intermediate',
        estimatedHours: 120,
      } 
    },
    { id: 'ECON201', type: NodeType.Course, position: { x: 800, y: 400 },
      data: { 
        label: 'ECON 201 Microeconomics', 
        credits: 3, 
        category: 'genEd',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        moduleId: 'genEd-social',
        skillTags: ['economics'],
        difficulty: 'intermediate',
        estimatedHours: 90,
      } 
    },
    { id: 'ELEC301', type: NodeType.Course, position: { x: 800, y: 500 },
      data: { 
        label: 'Free Elective', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        moduleId: 'elective-free',
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    
    // Spring Semester (15 cr)
    { id: 'CS310', type: NodeType.Course, position: { x: 800, y: 100 },
      data: { 
        label: 'CS 310 Operating Systems', 
        credits: 3, 
        category: 'coreCS',
        status: 'unplanned', 
        year: 3,
        semester: 'spring',
        moduleId: 'cs-systems',
        skillTags: ['operating-systems', 'concurrency'],
        difficulty: 'advanced',
        estimatedHours: 160,
      } 
    },
    { id: 'CS340', type: NodeType.Course, position: { x: 800, y: 200 },
      data: { 
        label: 'CS 340 AI/ML', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 3,
        semester: 'spring',
        moduleId: 'elective-upper',
        skillTags: ['machine-learning', 'ai'],
        difficulty: 'advanced',
        estimatedHours: 150,
      } 
    },
    { id: 'BUS220', type: NodeType.Course, position: { x: 800, y: 300 },
      data: { 
        label: 'BUS 220 Business Law', 
        credits: 3, 
        category: 'genEd',
        status: 'unplanned', 
        year: 3,
        semester: 'spring',
        moduleId: 'genEd-social',
        skillTags: ['business', 'law'],
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'ELEC302', type: NodeType.Course, position: { x: 800, y: 400 },
      data: { 
        label: 'Free Elective', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 3,
        semester: 'spring',
        moduleId: 'elective-free',
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'COMM201', type: NodeType.Course, position: { x: 800, y: 500 },
      data: { 
        label: 'COMM 201 Communication', 
        credits: 3, 
        category: 'genEd',
        status: 'unplanned', 
        year: 3,
        semester: 'spring',
        moduleId: 'genEd-humanities',
        difficulty: 'beginner',
        estimatedHours: 70,
      } 
    },
    
    // Elective requirement bundle (kept for comparison overlay testing)
    { id: 'ELEC_REQ', type: NodeType.Requirement, position: { x: 800, y: 600 },
      data: { label: 'Technical Elective (Choose 1)', status: 'unplanned', year: 3, semester: 'spring' }, 
      className: 'bundle-node' 
    },
    
    // ===== YEAR 4 (30 credits) =====
    // Fall Semester (15 cr)
    { id: 'CS401', type: NodeType.Course, position: { x: 1200, y: 100 },
      data: { 
        label: 'CS 401 Capstone I', 
        credits: 3, 
        category: 'capstone',
        status: 'unplanned', 
        year: 4,
        semester: 'fall',
        moduleId: 'capstone',
        residencyRequired: true,
        critical: true,
        skillTags: ['project-management', 'team-work'],
        difficulty: 'advanced',
        estimatedHours: 180,
      } 
    },
    { id: 'CS410', type: NodeType.Course, position: { x: 1200, y: 200 },
      data: { 
        label: 'CS 410 Networks', 
        credits: 3, 
        category: 'coreCS',
        status: 'unplanned', 
        year: 4,
        semester: 'fall',
        moduleId: 'cs-systems',
        skillTags: ['networking', 'protocols'],
        difficulty: 'advanced',
        estimatedHours: 140,
      } 
    },
    { id: 'CS420', type: NodeType.Course, position: { x: 1200, y: 300 },
      data: { 
        label: 'CS 420 Security', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 4,
        semester: 'fall',
        moduleId: 'elective-upper',
        skillTags: ['security', 'cryptography'],
        difficulty: 'advanced',
        estimatedHours: 150,
      }
    },
    { id: 'ELEC401', type: NodeType.Course, position: { x: 1200, y: 400 },
      data: { 
        label: 'Free Elective', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 4,
        semester: 'fall',
        moduleId: 'elective-free',
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'MGMT301', type: NodeType.Course, position: { x: 1200, y: 500 },
      data: { 
        label: 'MGMT 301 Leadership', 
        credits: 3, 
        category: 'genEd',
        status: 'unplanned', 
        year: 4,
        semester: 'fall',
        moduleId: 'genEd-social',
        difficulty: 'beginner',
        estimatedHours: 70,
      } 
    },
    
    // Spring Semester (15 cr)
    { id: 'CS490', type: NodeType.Course, position: { x: 1200, y: 100 },
      data: { 
        label: 'CS 490 Capstone II', 
        credits: 3, 
        category: 'capstone',
        status: 'unplanned', 
        year: 4,
        semester: 'spring',
        moduleId: 'capstone',
        residencyRequired: true,
        critical: true,
        skillTags: ['project-development', 'presentation'],
        difficulty: 'advanced',
        estimatedHours: 180,
      } 
    },
    { id: 'CS450', type: NodeType.Course, position: { x: 1200, y: 200 },
      data: { 
        label: 'CS 450 Cloud Computing', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 4,
        semester: 'spring',
        moduleId: 'elective-upper',
        skillTags: ['cloud', 'devops'],
        difficulty: 'advanced',
        estimatedHours: 140,
      } 
    },
    { id: 'ELEC402', type: NodeType.Course, position: { x: 1200, y: 300 },
      data: { 
        label: 'Free Elective', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 4,
        semester: 'spring',
        moduleId: 'elective-free',
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'ELEC403', type: NodeType.Course, position: { x: 1200, y: 400 },
      data: { 
        label: 'Free Elective', 
        credits: 3, 
        category: 'elective',
        status: 'unplanned', 
        year: 4,
        semester: 'spring',
        moduleId: 'elective-free',
        difficulty: 'beginner',
        estimatedHours: 80,
      } 
    },
    { id: 'PHIL301', type: NodeType.Course, position: { x: 1200, y: 500 },
      data: { 
        label: 'PHIL 301 Ethics', 
        credits: 3, 
        category: 'genEd',
        status: 'unplanned', 
        year: 4,
        semester: 'spring',
        moduleId: 'genEd-humanities',
        difficulty: 'intermediate',
        estimatedHours: 90,
      } 
    },
    
    // Plan B: Ghost nodes (alternatives shown in Compare overlay)
    { id: 'CS305_GHOST', type: NodeType.Course, position: { x: 800, y: 150 },
      data: { 
        label: 'CS 305', 
        credits: 3, 
        category: 'coreCS',
        status: 'unplanned', 
        year: 3,
        semester: 'fall',
        alternativeFor: 'CS 301' 
      }, 
      className: 'ghost-node hidden' 
    },
    { id: 'CS202_GHOST', type: NodeType.Course, position: { x: 400, y: 150 },
      data: { 
        label: 'CS 202', 
        credits: 3, 
        category: 'coreCS',
        status: 'planned', 
        year: 2,
        semester: 'fall',
        alternativeFor: 'CS 201' 
      }, 
      className: 'ghost-node hidden' 
    },
  ],
  
  edges: [
    // Spine sequence
    { id: 'e-y1-y2', source: 'year1', target: 'year2', type: EdgeType.Sequence, className: 'spine-edge' },
    { id: 'e-y2-y3', source: 'year2', target: 'year3', type: EdgeType.Sequence, className: 'spine-edge' },
    { id: 'e-y3-y4', source: 'year3', target: 'year4', type: EdgeType.Sequence, className: 'spine-edge' },
    
    // Prerequisites
    { id: 'e-CS101-CS201', source: 'CS101', target: 'CS201', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS201-CS301', source: 'CS201', target: 'CS301', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS201-CS310', source: 'CS201', target: 'CS310', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-MATH151-MATH251', source: 'MATH151', target: 'MATH251', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS205-CS310', source: 'CS205', target: 'CS310', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS301-CS401', source: 'CS301', target: 'CS401', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS310-CS410', source: 'CS310', target: 'CS410', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    { id: 'e-CS401-CS490', source: 'CS401', target: 'CS490', type: EdgeType.Prerequisite, className: 'prereq-edge' },
    
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
