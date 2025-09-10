import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEduTreeLoading } from '../providers/EduTreeLoadingProvider';
import { 
  EduCourse, 
  RequirementBlock, 
  BlockMember, 
  BlockGate, 
  GateEdge 
} from '@/lib/types/eduTree';
import { toast } from '@/hooks/use-toast';

export function useEduTreeQueries() {
  const { setLoading, setError } = useEduTreeLoading();

  // Courses query
  const coursesQuery = useQuery({
    queryKey: ['edu-courses'],
    queryFn: async () => {
      try {
        setLoading('courses', true);
        const { data, error } = await supabase
          .from('edu_courses')
          .select('*')
          .order('level_year', { ascending: true })
          .order('code', { ascending: true });
        
        if (error) throw error;
        
        console.log('✅ Courses loaded:', data?.length || 0);
        return data as EduCourse[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load courses';
        setError('courses', errorMessage);
        console.error('❌ Courses query failed:', error);
        throw error;
      } finally {
        setLoading('courses', false);
      }
    },
    retry: (failureCount, error) => {
      console.log(`🔄 Courses query retry ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Blocks query  
  const blocksQuery = useQuery({
    queryKey: ['requirement-blocks'],
    queryFn: async () => {
      try {
        setLoading('blocks', true);
        const { data, error } = await supabase
          .from('requirement_blocks')
          .select('*')
          .order('level_year', { ascending: true })
          .order('title', { ascending: true });
        
        if (error) throw error;
        
        console.log('✅ Blocks loaded:', data?.length || 0);
        return data as RequirementBlock[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load requirement blocks';
        setError('blocks', errorMessage);
        console.error('❌ Blocks query failed:', error);
        throw error;
      } finally {
        setLoading('blocks', false);
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // Block members query
  const blockMembersQuery = useQuery({
    queryKey: ['block-members'],
    queryFn: async () => {
      try {
        setLoading('blockMembers', true);
        const { data, error } = await supabase
          .from('block_members')
          .select('*');
        
        if (error) throw error;
        
        console.log('✅ Block members loaded:', data?.length || 0);
        return data as BlockMember[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load block relationships';
        setError('blockMembers', errorMessage);
        console.error('❌ Block members query failed:', error);
        throw error;
      } finally {
        setLoading('blockMembers', false);
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // Gates query
  const gatesQuery = useQuery({
    queryKey: ['block-gates'],
    queryFn: async () => {
      try {
        setLoading('gates', true);
        const { data, error } = await supabase
          .from('block_gates')
          .select('*');
        
        if (error) throw error;
        
        console.log('✅ Gates loaded:', data?.length || 0);
        return data as BlockGate[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load prerequisite gates';
        setError('gates', errorMessage);
        console.error('❌ Gates query failed:', error);
        
        // Gates are not critical - allow partial functionality
        toast({
          title: "Prerequisite data unavailable",
          description: "Some prerequisite information couldn't be loaded. The tree will show all courses as available.",
          variant: "destructive",
        });
        
        return [] as BlockGate[]; // Return empty array to allow partial functionality
      } finally {
        setLoading('gates', false);
      }
    },
    retry: 2, // Fewer retries for non-critical data
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    staleTime: 5 * 60 * 1000,
  });

  // Gate edges query
  const gateEdgesQuery = useQuery({
    queryKey: ['prereq-to-block'],
    queryFn: async () => {
      try {
        setLoading('gateEdges', true);
        const { data, error } = await supabase
          .from('prereq_to_block')
          .select('*');
        
        if (error) throw error;
        
        console.log('✅ Gate edges loaded:', data?.length || 0);
        return data as GateEdge[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load prerequisite connections';
        setError('gateEdges', errorMessage);
        console.error('❌ Gate edges query failed:', error);
        
        // Gate edges are not critical - allow partial functionality
        toast({
          title: "Pathway connections unavailable", 
          description: "Course progression paths couldn't be loaded. Prerequisites may not be enforced.",
          variant: "destructive",
        });
        
        return [] as GateEdge[]; // Return empty array to allow partial functionality
      } finally {
        setLoading('gateEdges', false);
      }
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
    
    // Convenience flags
    isLoading: coursesQuery.isLoading || blocksQuery.isLoading,
    hasError: coursesQuery.isError || blocksQuery.isError,
    isCriticalDataReady: coursesQuery.isSuccess && blocksQuery.isSuccess,
    
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