import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  fetchEduCourses,
  fetchRequirementBlocks,
  fetchBlockMembers,
  fetchBlockGates,
  fetchGateEdges,
} from '@/shared/lib/api/edutree';
import type {
  EduCourse,
  RequirementBlock,
  BlockMember,
  BlockGate,
  GateEdge,
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
    queryKey: QUERY_KEYS.EDU_COURSES(),
    queryFn: fetchEduCourses,
  });

  const blocksQuery = useQuery({
    queryKey: QUERY_KEYS.REQUIREMENT_BLOCKS(),
    queryFn: () => fetchRequirementBlocks(),
  });

  const blockMembersQuery = useQuery({
    queryKey: QUERY_KEYS.BLOCK_MEMBERS(),
    queryFn: fetchBlockMembers,
  });

  const gatesQuery = useQuery({
    queryKey: QUERY_KEYS.BLOCK_GATES(),
    queryFn: fetchBlockGates,
  });

  const gateEdgesQuery = useQuery({
    queryKey: QUERY_KEYS.GATE_EDGES(),
    queryFn: fetchGateEdges,
  });

  const anyLoading =
    coursesQuery.isLoading ||
    blocksQuery.isLoading ||
    blockMembersQuery.isLoading ||
    gatesQuery.isLoading ||
    gateEdgesQuery.isLoading;

  const errors = [
    coursesQuery.error,
    blocksQuery.error,
    blockMembersQuery.error,
    gatesQuery.error,
    gateEdgesQuery.error,
  ].filter(Boolean);

  const coreSuccess = coursesQuery.isSuccess && blocksQuery.isSuccess;

  if (anyLoading) {
    return {
      data: { courses: [], blocks: [], blockMembers: [], gates: [], gateEdges: [] },
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

  if (!coreSuccess) {
    const firstError = coursesQuery.error || blocksQuery.error;
    return {
      data: { courses: [], blocks: [], blockMembers: [], gates: [], gateEdges: [] },
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

  const data = {
    courses: coursesQuery.data ?? [],
    blocks: blocksQuery.data ?? [],
    blockMembers: blockMembersQuery.data ?? [],
    gates: gatesQuery.data ?? [],
    gateEdges: gateEdgesQuery.data ?? [],
  };

  const hasData = data.courses.length > 0 || data.blocks.length > 0;

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
