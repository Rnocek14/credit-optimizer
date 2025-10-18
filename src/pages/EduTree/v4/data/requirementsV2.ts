/**
 * CS Degree Requirements V2 - Hierarchical Structure
 * Two-level nesting: Bucket → Sequence → Courses
 */
import { DegreeRequirementsV2, HierarchicalRequirement } from '../types/requirementsHierarchy';

export const CS_DEGREE_REQUIREMENTS_V2: DegreeRequirementsV2 = {
  totalCredits: 120,
  residencyMinimum: 30,
  
  requirements: [
    // ========== CORE COMPUTER SCIENCE ==========
    {
      id: 'core-cs',
      label: 'Core Computer Science',
      category: 'coreCS',
      level: 'bucket',
      type: 'all-required',
      icon: '🧠',
      description: 'Essential CS theory and systems',
      children: [
        {
          id: 'cs-foundations',
          label: 'CS Foundations',
          category: 'coreCS',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['CS101', 'CS102', 'CS201', 'CS202', 'CS205'],
          description: 'Programming fundamentals and data structures',
          icon: '💻',
          parentId: 'core-cs'
        },
        {
          id: 'cs-systems',
          label: 'Systems & Architecture',
          category: 'coreCS',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['CS301', 'CS305', 'CS310', 'CS410'],
          description: 'Databases, architecture, operating systems, networks',
          icon: '⚙️',
          parentId: 'core-cs'
        }
      ]
    },
    
    // ========== MATH & SCIENCE ==========
    {
      id: 'math-science',
      label: 'Math & Science',
      category: 'math',
      level: 'bucket',
      type: 'all-required',
      icon: '🔬',
      description: 'Mathematical and scientific foundations',
      children: [
        {
          id: 'math-calculus',
          label: 'Calculus Sequence',
          category: 'math',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['MATH151', 'MATH152'],
          description: 'Calculus I & II',
          icon: '📐',
          parentId: 'math-science'
        },
        {
          id: 'math-advanced',
          label: 'Advanced Math',
          category: 'math',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['MATH251', 'STAT220'],
          description: 'Linear algebra and statistics',
          icon: '📊',
          parentId: 'math-science'
        },
        {
          id: 'physics-sequence',
          label: 'Physics',
          category: 'math',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['PHYS211', 'PHYS212'],
          description: 'Physics for engineers',
          icon: '⚛️',
          parentId: 'math-science'
        }
      ]
    },
    
    // ========== GENERAL EDUCATION ==========
    {
      id: 'general-education',
      label: 'General Education',
      category: 'genEd',
      level: 'bucket',
      type: 'select-any',
      minCredits: 30,
      icon: '🎓',
      description: 'Breadth requirements across disciplines',
      children: [
        {
          id: 'genEd-communication',
          label: 'Communication',
          category: 'genEd',
          level: 'sequence',
          type: 'all-required',
          courseIds: ['ENG101', 'ENG102', 'SPCH101'],
          description: 'Written and oral communication',
          icon: '💬',
          parentId: 'general-education'
        },
        {
          id: 'genEd-humanities',
          label: 'Humanities',
          category: 'genEd',
          level: 'sequence',
          type: 'select-any',
          minCredits: 12,
          tag: 'humanities',
          description: 'Arts, literature, philosophy',
          icon: '🎨',
          parentId: 'general-education'
        },
        {
          id: 'genEd-social',
          label: 'Social Sciences',
          category: 'genEd',
          level: 'sequence',
          type: 'select-any',
          minCredits: 9,
          tag: 'social',
          description: 'Psychology, sociology, economics',
          icon: '👥',
          parentId: 'general-education'
        }
      ]
    },
    
    // ========== ELECTIVES ==========
    {
      id: 'electives',
      label: 'Electives',
      category: 'elective',
      level: 'bucket',
      type: 'select-any',
      minCredits: 19,
      icon: '✨',
      description: 'Free choice and upper-level courses',
      children: [
        {
          id: 'upper-electives',
          label: 'Upper-Level Electives',
          category: 'elective',
          level: 'sequence',
          type: 'select-any',
          minCredits: 12,
          tag: 'upper-div',
          description: '300/400 level courses',
          icon: '🎓',
          parentId: 'electives'
        },
        {
          id: 'elective-free',
          label: 'Free Electives',
          category: 'elective',
          level: 'sequence',
          type: 'select-any',
          minCredits: 7,
          tag: 'free',
          description: 'Any approved courses',
          icon: '🌟',
          parentId: 'electives'
        }
      ]
    },
    
    // ========== CAPSTONE ==========
    {
      id: 'capstone',
      label: 'Capstone Project',
      category: 'capstone',
      level: 'sequence',
      type: 'all-required',
      courseIds: ['CS497', 'CS498'],
      description: 'Senior design and research',
      icon: '🏆'
    }
  ],
  
  // Legacy categories for backward compatibility
  categories: {
    coreCS: { required: 45, label: 'Core CS' },
    math: { required: 20, label: 'Math & Science' },
    genEd: { required: 30, label: 'General Education' },
    elective: { required: 19, label: 'Electives' },
    capstone: { required: 6, label: 'Capstone' }
  }
};
