import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EduCourse, RequirementBlock, BlockMember, BlockGate, GateEdge } from "@/lib/types/eduTree";

export interface EduTreeData {
  courses: EduCourse[];
  blocks: RequirementBlock[];
  blockMembers: BlockMember[];
  gates: BlockGate[];
  gateEdges: GateEdge[];
}

export function useEduTreeData(trackId?: string) {
  const [error, setError] = useState<Error | null>(null);

  // Fetch all data in parallel
  const coursesQuery = useQuery({
    queryKey: ['edu-courses', trackId],
    queryFn: async () => {
      console.log('[useEduTreeData] Fetching courses for track:', trackId);
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .order('level_year', { ascending: true })
        .order('code', { ascending: true });
      
      if (error) {
        console.error('[useEduTreeData] Courses query error:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }
      
      console.log('[useEduTreeData] Courses fetched:', data?.length || 0);
      return data as EduCourse[];
    },
    retry: 3,
    retryDelay: 1000,
  });

  const blocksQuery = useQuery({
    queryKey: ['requirement-blocks', trackId],
    queryFn: async () => {
      console.log('[useEduTreeData] Fetching blocks for track:', trackId);
      const { data, error } = await supabase
        .from('requirement_blocks')
        .select('*')
        .order('level_year', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) {
        console.error('[useEduTreeData] Blocks query error:', error);
        throw new Error(`Failed to fetch blocks: ${error.message}`);
      }
      
      console.log('[useEduTreeData] Blocks fetched:', data?.length || 0);
      return data as RequirementBlock[];
    },
    retry: 3,
    retryDelay: 1000,
  });

  const blockMembersQuery = useQuery({
    queryKey: ['block-members', trackId],
    queryFn: async () => {
      console.log('[useEduTreeData] Fetching block members for track:', trackId);
      const { data, error } = await supabase
        .from('block_members')
        .select('*');
      
      if (error) {
        console.error('[useEduTreeData] Block members query error:', error);
        throw new Error(`Failed to fetch block members: ${error.message}`);
      }
      
      console.log('[useEduTreeData] Block members fetched:', data?.length || 0);
      return data as BlockMember[];
    },
    retry: 3,
    retryDelay: 1000,
  });

  const gatesQuery = useQuery({
    queryKey: ['block-gates', trackId],
    queryFn: async () => {
      console.log('[useEduTreeData] Fetching gates for track:', trackId);
      const { data, error } = await supabase
        .from('block_gates')
        .select('*');
      
      if (error) {
        console.error('[useEduTreeData] Gates query error:', error);
        throw new Error(`Failed to fetch gates: ${error.message}`);
      }
      
      console.log('[useEduTreeData] Gates fetched:', data?.length || 0);
      return data as BlockGate[];
    },
    retry: 3,
    retryDelay: 1000,
  });

  const gateEdgesQuery = useQuery({
    queryKey: ['prereq-to-block', trackId],
    queryFn: async () => {
      console.log('[useEduTreeData] Fetching gate edges for track:', trackId);
      const { data, error } = await supabase
        .from('prereq_to_block')
        .select('*');
      
      if (error) {
        console.error('[useEduTreeData] Gate edges query error:', error);
        throw new Error(`Failed to fetch gate edges: ${error.message}`);
      }
      
      console.log('[useEduTreeData] Gate edges fetched:', data?.length || 0);
      return data as GateEdge[];
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Combine loading states
  const loading = coursesQuery.isLoading || blocksQuery.isLoading || 
                 blockMembersQuery.isLoading || gatesQuery.isLoading || 
                 gateEdgesQuery.isLoading;

  // Detect and surface any query errors
  useEffect(() => {
    const queryError = coursesQuery.error || blocksQuery.error || 
                      blockMembersQuery.error || gatesQuery.error || 
                      gateEdgesQuery.error;
    
    if (queryError) {
      console.error('[useEduTreeData] Query error detected:', queryError);
      setError(queryError as Error);
    } else {
      setError(null);
    }
  }, [coursesQuery.error, blocksQuery.error, blockMembersQuery.error, 
      gatesQuery.error, gateEdgesQuery.error]);

  // Return data with proper defaults
  const data: EduTreeData = {
    courses: coursesQuery.data ?? [],
    blocks: blocksQuery.data ?? [],
    blockMembers: blockMembersQuery.data ?? [],
    gates: gatesQuery.data ?? [],
    gateEdges: gateEdgesQuery.data ?? [],
  };

  const hasData = data.courses.length > 0 && data.blocks.length > 0;

  return {
    data,
    loading,
    error,
    hasData,
    // Individual query states for debugging
    coursesLoading: coursesQuery.isLoading,
    blocksLoading: blocksQuery.isLoading,
    blockMembersLoading: blockMembersQuery.isLoading,
    gatesLoading: gatesQuery.isLoading,
    gateEdgesLoading: gateEdgesQuery.isLoading,
  };
}