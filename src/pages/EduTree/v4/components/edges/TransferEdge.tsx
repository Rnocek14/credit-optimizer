/**
 * TransferEdge - Custom edge for transfer credit equivalencies with tooltip
 */
import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

export function TransferEdge({
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  data,
  ...props
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  
  const policyText = (data as any)?.policyText || 
    "Transfer Credit: CLEP Calculus → MATH 151\nPolicy: Max 60 transfer credits. CLEP requires score ≥ 50.\nResidency: Must complete ≥30 credits in residence.";
  
  return (
    <>
      <BaseEdge id={id} path={edgePath} {...props} />
      <title>{policyText}</title>
    </>
  );
}
