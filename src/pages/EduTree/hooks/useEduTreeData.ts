import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  EduCourse,
  RequirementBlock,
  BlockMember,
  BlockGate,
  GateEdge
} from '@/lib/types/eduTree';

const DEV = import.meta.env.DEV;

export interface EduTreeDataResult {
  data: {
    courses: EduCourse[];
    blocks: RequirementBlock[];
    blockMembers: BlockMember[];
    gates: BlockGate[];
    gateEdges: GateEdge[];
  };
  loading: boolean;
  error: Error | null;
  hasData: boolean;
  coursesLoading: boolean;
  blocksLoading: boolean;
  blockMembersLoading: boolean;
  gatesLoading: boolean;
  gateEdgesLoading: boolean;
}

export function useEduTreeData(): EduTreeDataResult {
  const coursesQuery = useQuery({
    queryKey: ['edu-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .order('code', { ascending: true });
      
      if (error) throw error;
      return (data as EduCourse[]) || [];
    },
  });

  const blocksQuery = useQuery({
    queryKey: ['requirement-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) throw error;
      return (data as RequirementBlock[]) || [];
    },
  });

  const blockMembersQuery = useQuery({
    queryKey: ['block-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_members')
        .select('*');
      
      if (error) throw error;
      return (data as BlockMember[]) || [];
    },
  });

  const gatesQuery = useQuery({
    queryKey: ['block-gates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_gates')
        .select('*');
      
      if (error) throw error;
      return (data as BlockGate[]) || [];
    },
  });

  const gateEdgesQuery = useQuery({
    queryKey: ['prereq-to-block'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prereq_to_block')
        .select('*');
      
      if (error) throw error;
      return (data as GateEdge[]) || [];
    },
  });

  // Check for any loading state
  const anyLoading =
    coursesQuery.isLoading ||
    blocksQuery.isLoading ||
    blockMembersQuery.isLoading ||
    gatesQuery.isLoading ||
    gateEdgesQuery.isLoading;

  // Collect all errors
  const errors = [
    coursesQuery.error,
    blocksQuery.error,
    blockMembersQuery.error,
    gatesQuery.error,
    gateEdgesQuery.error
  ].filter(Boolean);

  // Core data (courses and blocks) must be available
  const coreSuccess = coursesQuery.isSuccess && blocksQuery.isSuccess;
  const coreData = {
    courses: coursesQuery.data ?? [],
    blocks: blocksQuery.data ?? [],
  };

  // Debug logging
  if (DEV) {
    console.log('[useEduTreeData] Query States:', {
      courses: { loading: coursesQuery.isLoading, success: coursesQuery.isSuccess, error: !!coursesQuery.error, dataLength: coursesQuery.data?.length },
      blocks: { loading: blocksQuery.isLoading, success: blocksQuery.isSuccess, error: !!blocksQuery.error, dataLength: blocksQuery.data?.length },
      blockMembers: { loading: blockMembersQuery.isLoading, success: blockMembersQuery.isSuccess, error: !!blockMembersQuery.error },
      gates: { loading: gatesQuery.isLoading, success: gatesQuery.isSuccess, error: !!gatesQuery.error },
      gateEdges: { loading: gateEdgesQuery.isLoading, success: gateEdgesQuery.isSuccess, error: !!gateEdgesQuery.error },
      anyLoading,
      coreSuccess,
      errorCount: errors.length
    });
  }

  // Still loading core data
  if (anyLoading) {
    return {
      data: { 
        courses: [], 
        blocks: [], 
        blockMembers: [], 
        gates: [], 
        gateEdges: [] 
      },
      loading: true,
      error: null,
      hasData: false,
      coursesLoading: coursesQuery.isLoading,
      blocksLoading: blocksQuery.isLoading,
      blockMembersLoading: blockMembersQuery.isLoading,
      gatesLoading: gatesQuery.isLoading,
      gateEdgesLoading: gateEdgesQuery.isLoading,
    };
  }

  // Core data failed
  if (!coreSuccess) {
    const firstError = coursesQuery.error || blocksQuery.error;
    console.error('[useEduTreeData] Core data failed:', firstError);
    return {
      data: { 
        courses: [], 
        blocks: [], 
        blockMembers: [], 
        gates: [], 
        gateEdges: [] 
      },
      loading: false,
      error: firstError as Error,
      hasData: false,
      coursesLoading: false,
      blocksLoading: false,
      blockMembersLoading: false,
      gatesLoading: false,
      gateEdgesLoading: false,
    };
  }

  // Core data available, return with optional data (allow partial success)
  const data = {
    courses: coreData.courses,
    blocks: coreData.blocks,
    blockMembers: blockMembersQuery.data ?? [],
    gates: gatesQuery.data ?? [],
    gateEdges: gateEdgesQuery.data ?? [],
  };

  const hasData = data.courses.length > 0 || data.blocks.length > 0;
  
  if (DEV) {
    console.log('[useEduTreeData] Final Result:', {
      courses: data.courses.length,
      blocks: data.blocks.length,
      blockMembers: data.blockMembers.length,
      gates: data.gates.length,
      gateEdges: data.gateEdges.length,
      hasData,
      errorCount: errors.length
    });
  }

  return {
    data,
    loading: false,
    error: errors.length > 0 ? (errors[0] as Error) : null,
    hasData,
    coursesLoading: false,
    blocksLoading: false,
    blockMembersLoading: false,
    gatesLoading: false,
    gateEdgesLoading: false,
  };
}