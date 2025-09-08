/**
 * Florida State Articulation Agreement Data
 * Based on Florida Department of Education articulation frameworks
 */

export interface FloridaArticulationMapping {
  id: string;
  sourceInstitution: string;
  targetInstitution: string;
  sourceCourse: {
    code: string;
    title: string;
    credits: number;
  };
  targetCourse: {
    code: string;
    title: string;
    credits: number;
  };
  transferRate: number; // 1.0 = full transfer
  effectiveDate: string;
  expirationDate?: string;
  conditions: string[];
  institutionType: 'community_college' | 'state_university' | 'private' | 'technical';
  articulationLevel: 'general_education' | 'major_prerequisite' | 'elective' | 'program_specific';
}

export interface FloridaInstitution {
  id: string;
  name: string;
  type: 'community_college' | 'state_university' | 'private' | 'technical';
  region: 'north' | 'central' | 'south' | 'panhandle';
  articulationAgreements: string[]; // IDs of articulation mappings
}

// Florida Community Colleges and State Universities
export const floridaInstitutions: FloridaInstitution[] = [
  {
    id: 'valencia',
    name: 'Valencia College',
    type: 'community_college',
    region: 'central',
    articulationAgreements: ['valencia-ucf-001', 'valencia-usf-001']
  },
  {
    id: 'ucf',
    name: 'University of Central Florida',
    type: 'state_university',
    region: 'central',
    articulationAgreements: ['valencia-ucf-001', 'seminole-ucf-001']
  },
  {
    id: 'usf',
    name: 'University of South Florida',
    type: 'state_university',
    region: 'central',
    articulationAgreements: ['valencia-usf-001', 'hillsborough-usf-001']
  },
  {
    id: 'fiu',
    name: 'Florida International University',
    type: 'state_university',
    region: 'south',
    articulationAgreements: ['mdc-fiu-001', 'broward-fiu-001']
  },
  {
    id: 'mdc',
    name: 'Miami Dade College',
    type: 'community_college',
    region: 'south',
    articulationAgreements: ['mdc-fiu-001', 'mdc-fau-001']
  }
];

// Sample articulation mappings
export const floridaArticulationMappings: FloridaArticulationMapping[] = [
  {
    id: 'valencia-ucf-001',
    sourceInstitution: 'valencia',
    targetInstitution: 'ucf',
    sourceCourse: {
      code: 'MAC2311',
      title: 'Calculus I',
      credits: 4
    },
    targetCourse: {
      code: 'MAC2311',
      title: 'Calculus I',
      credits: 4
    },
    transferRate: 1.0,
    effectiveDate: '2024-01-01',
    conditions: ['Minimum grade of C'],
    institutionType: 'community_college',
    articulationLevel: 'major_prerequisite'
  },
  {
    id: 'valencia-ucf-002',
    sourceInstitution: 'valencia',
    targetInstitution: 'ucf',
    sourceCourse: {
      code: 'ENC1101',
      title: 'Composition I',
      credits: 3
    },
    targetCourse: {
      code: 'ENC1101',
      title: 'Composition I',
      credits: 3
    },
    transferRate: 1.0,
    effectiveDate: '2024-01-01',
    conditions: ['Minimum grade of C'],
    institutionType: 'community_college',
    articulationLevel: 'general_education'
  },
  {
    id: 'mdc-fiu-001',
    sourceInstitution: 'mdc',
    targetInstitution: 'fiu',
    sourceCourse: {
      code: 'PSY2012',
      title: 'General Psychology',
      credits: 3
    },
    targetCourse: {
      code: 'PSY2012',
      title: 'General Psychology',
      credits: 3
    },
    transferRate: 1.0,
    effectiveDate: '2024-01-01',
    conditions: ['Minimum grade of C'],
    institutionType: 'community_college',
    articulationLevel: 'general_education'
  }
];

// Florida-specific pathways and programs
export const floridaProgramPathways = [
  {
    id: 'aa-to-ba-business',
    name: 'AA to BA Business Administration',
    description: 'Direct transfer pathway from community college AA to university BA',
    participatingInstitutions: ['valencia', 'mdc', 'ucf', 'fiu', 'usf'],
    guaranteedTransfer: true,
    totalCredits: 120,
    prerequisites: ['Associate of Arts degree', 'Minimum 2.0 GPA'],
    articulationMappings: ['valencia-ucf-001', 'mdc-fiu-001']
  },
  {
    id: 'as-to-bs-engineering',
    name: 'AS to BS Engineering',
    description: 'Associate of Science to Bachelor of Science in Engineering',
    participatingInstitutions: ['valencia', 'ucf', 'usf'],
    guaranteedTransfer: false,
    totalCredits: 128,
    prerequisites: ['Associate of Science degree', 'Calculus I & II', 'Physics I & II'],
    articulationMappings: ['valencia-ucf-001']
  }
];

// ETL functions for Florida data
export async function fetchFloridaArticulationData(): Promise<FloridaArticulationMapping[]> {
  // In a real implementation, this would fetch from Florida DOE APIs
  // For now, return mock data with a delay to simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(floridaArticulationMappings);
    }, 1000);
  });
}

export function findArticulationMappings(
  sourceInstitutionId: string,
  targetInstitutionId: string
): FloridaArticulationMapping[] {
  return floridaArticulationMappings.filter(
    mapping => 
      mapping.sourceInstitution === sourceInstitutionId &&
      mapping.targetInstitution === targetInstitutionId
  );
}

export function getTransferCredits(
  completedCourses: Array<{ code: string; institution: string; credits: number }>,
  targetInstitution: string
): Array<{ 
  originalCourse: string; 
  transfersTo: string; 
  transferredCredits: number; 
  articulationId: string 
}> {
  const transfers: Array<{
    originalCourse: string;
    transfersTo: string;
    transferredCredits: number;
    articulationId: string;
  }> = [];

  completedCourses.forEach(course => {
    const mapping = floridaArticulationMappings.find(
      m => 
        m.sourceInstitution === course.institution &&
        m.targetInstitution === targetInstitution &&
        m.sourceCourse.code === course.code
    );

    if (mapping) {
      transfers.push({
        originalCourse: `${course.code} (${mapping.sourceCourse.title})`,
        transfersTo: `${mapping.targetCourse.code} (${mapping.targetCourse.title})`,
        transferredCredits: Math.floor(course.credits * mapping.transferRate),
        articulationId: mapping.id
      });
    }
  });

  return transfers;
}

// Generate Florida-specific badges and filters
export function getFloridaArticulationBadge(nodeId: string): {
  hasFlArticulation: boolean;
  institutionCount: number;
  guaranteedTransfer: boolean;
} {
  const relatedMappings = floridaArticulationMappings.filter(
    mapping => mapping.sourceCourse.code === nodeId || mapping.targetCourse.code === nodeId
  );

  const uniqueInstitutions = new Set([
    ...relatedMappings.map(m => m.sourceInstitution),
    ...relatedMappings.map(m => m.targetInstitution)
  ]);

  const hasGuaranteedTransfer = relatedMappings.some(
    mapping => mapping.transferRate === 1.0 && mapping.articulationLevel !== 'elective'
  );

  return {
    hasFlArticulation: relatedMappings.length > 0,
    institutionCount: uniqueInstitutions.size,
    guaranteedTransfer: hasGuaranteedTransfer
  };
}