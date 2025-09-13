import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge 
} from '@/lib/types/eduTree';

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

  // Check if all queries are successful
  const allSuccess =
    coursesQuery.isSuccess &&
    blocksQuery.isSuccess &&
    blockMembersQuery.isSuccess &&
    gatesQuery.isSuccess &&
    gateEdgesQuery.isSuccess;

  // Check for any loading state
  const anyLoading =
    coursesQuery.isLoading ||
    blocksQuery.isLoading ||
    blockMembersQuery.isLoading ||
    gatesQuery.isLoading ||
    gateEdgesQuery.isLoading;

  // Only treat real Supabase errors as "error"
  const queryError =
    coursesQuery.error ||
    blocksQuery.error ||
    blockMembersQuery.error ||
    gatesQuery.error ||
    gateEdgesQuery.error;

  // Return safe defaults if not all queries are successful yet
  if (!allSuccess) {
    return {
      data: { 
        courses: [], 
        blocks: [], 
        blockMembers: [], 
        gates: [], 
        gateEdges: [] 
      },
      loading: anyLoading,
      error: null,
      hasData: false,
      coursesLoading: coursesQuery.isLoading,
      blocksLoading: blocksQuery.isLoading,
      blockMembersLoading: blockMembersQuery.isLoading,
      gatesLoading: gatesQuery.isLoading,
      gateEdgesLoading: gateEdgesQuery.isLoading,
    };
  }

  // Normalize data here (no undefineds)
  const data = {
    courses: coursesQuery.data ?? [],
    blocks: blocksQuery.data ?? [],
    blockMembers: blockMembersQuery.data ?? [],
    gates: gatesQuery.data ?? [],
    gateEdges: gateEdgesQuery.data ?? [],
  };

  return {
    data,
    loading: false,
    error: (queryError as Error) || null,
    hasData: data.courses.length + data.blocks.length > 0,
    coursesLoading: false,
    blocksLoading: false,
    blockMembersLoading: false,
    gatesLoading: false,
    gateEdgesLoading: false,
  };
}