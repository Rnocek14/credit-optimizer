import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge 
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';

export function useEduTreeQueries() {
  // Courses query
  const coursesQuery = useQuery({
    queryKey: ['edu-courses'],
    queryFn: async () => {
      console.log('🔄 Loading courses...');
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .order('level_year', { ascending: true })
        .order('code', { ascending: true });
      
      if (error) throw error;
      
      console.log('✅ Courses loaded:', data?.length || 0);
      return data as EduCourse[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // Blocks query  
  const blocksQuery = useQuery({
    queryKey: ['requirement-blocks'],
    queryFn: async () => {
      console.log('🔄 Loading blocks...');
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) throw error;
      
      console.log('✅ Blocks loaded:', data?.length || 0);
      return data as RequirementBlock[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // Block members query
  const blockMembersQuery = useQuery({
    queryKey: ['block-members'],
    queryFn: async () => {
      console.log('🔄 Loading block members...');
      const { data, error } = await supabase
        .from('block_members')
        .select('*');
      
      if (error) throw error;
      
      console.log('✅ Block members loaded:', data?.length || 0);
      return data as BlockMember[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // Gates query
  const gatesQuery = useQuery({
    queryKey: ['block-gates'],
    queryFn: async () => {
      console.log('🔄 Loading gates...');
      const { data, error } = await supabase
        .from('block_gates')
        .select('*');
      
      if (error) throw error;
      
      console.log('✅ Gates loaded:', data?.length || 0);
      return data as BlockGate[];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    staleTime: 5 * 60 * 1000,
  });

  // Gate edges query
  const gateEdgesQuery = useQuery({
    queryKey: ['prereq-to-block'],
    queryFn: async () => {
      console.log('🔄 Loading gate edges...');
      const { data, error } = await supabase
        .from('prereq_to_block')
        .select('*');
      
      if (error) throw error;
      
      console.log('✅ Gate edges loaded:', data?.length || 0);
      return data as GateEdge[];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    staleTime: 5 * 60 * 1000,
  });

  return {
    courses: coursesQuery.data || [],
    blocks: blocksQuery.data || [],
    blockMembers: blockMembersQuery.data || [],
    gates: gatesQuery.data || [],
    gateEdges: gateEdgesQuery.data || [],
    
    // Query states
    queries: {
      courses: coursesQuery,
      blocks: blocksQuery,
      blockMembers: blockMembersQuery,
      gates: gatesQuery,
      gateEdges: gateEdgesQuery,
    },
    
    // Loading states
    loading: {
      courses: coursesQuery.isLoading,
      blocks: blocksQuery.isLoading,
      blockMembers: blockMembersQuery.isLoading,
      gates: gatesQuery.isLoading,
      gateEdges: gateEdgesQuery.isLoading,
      layout: false,
    },
    
    // Error states  
    errors: {
      courses: coursesQuery.error?.message,
      blocks: blocksQuery.error?.message,
      blockMembers: blockMembersQuery.error?.message,
      gates: gatesQuery.error?.message,
      gateEdges: gateEdgesQuery.error?.message,
    },
    
    // Convenience flags
    isLoading: coursesQuery.isLoading || blocksQuery.isLoading,
    hasError: coursesQuery.isError || blocksQuery.isError,
    isCriticalDataReady: (coursesQuery.data?.length || 0) > 0 && (blocksQuery.data?.length || 0) > 0,
    criticalDataLoaded: !coursesQuery.isLoading && !blocksQuery.isLoading,
    allDataLoaded: !coursesQuery.isLoading && !blocksQuery.isLoading && 
                   !blockMembersQuery.isLoading && !gatesQuery.isLoading && 
                   !gateEdgesQuery.isLoading,
    
    // Retry functions
    refetchAll: () => {
      coursesQuery.refetch();
      blocksQuery.refetch();
      blockMembersQuery.refetch();
      gatesQuery.refetch();
      gateEdgesQuery.refetch();
    }
  };
}