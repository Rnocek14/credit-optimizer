/**
 * CompareEdge - Shows substitution relationship between Plan A and Plan B courses
 */
import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

export function CompareEdge({
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  data,
  style,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  
  const comparisonText = (data as any)?.comparisonText || 
    "Alternative course option in Plan B\nCompare: cost, difficulty, and prerequisites";
  
  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      <title>{comparisonText}</title>
    </>
  );
}
