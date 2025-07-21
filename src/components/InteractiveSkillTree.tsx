import React, { useState, useEffect, useCallback } from 'react';
import { SkillTreeNode } from './SkillTreeNode';

export const InteractiveSkillTree = ({
  skills,
  userProgress,
  skillEdges,
  filteredSkills,
  recommendedSkills,
  availableCategories,
  onSkillClick,
  showMinimap = true,
  layoutMode = 'hierarchy'
}) => {
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 });

  const getSkillDepthMap = useCallback(() => {
    const depthMap = new Map();
    const visited = new Set();

    const dfs = (skillId, depth) => {
      if (visited.has(skillId)) return;
      visited.add(skillId);
      depthMap.set(skillId, depth);
      const children = skillEdges.filter(e => e.skill_id === skillId);
      children.forEach(edge => dfs(edge.prerequisite_skill_id, depth + 1));
    };

    filteredSkills.forEach(skill => dfs(skill.id, 0));
    return depthMap;
  }, [filteredSkills, skillEdges]);

  const generateHierarchyLayout = useCallback(() => {
    const positions = new Map();
    const depthMap = getSkillDepthMap();

    const levelMap = new Map();
    for (let [id, depth] of depthMap.entries()) {
      if (!levelMap.has(depth)) levelMap.set(depth, []);
      levelMap.get(depth).push(id);
    }

    const levelHeight = 150;
    const nodeWidth = 100;
    const paddingX = 80;

    Array.from(levelMap.entries()).forEach(([depth, ids]) => {
      ids.forEach((id, i) => {
        const x = i * (nodeWidth + paddingX) + 100;
        const y = depth * levelHeight + 100;
        positions.set(id, { x, y });
      });
    });
    return positions;
  }, [getSkillDepthMap]);

  const skillPositions = generateHierarchyLayout();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const xs = Array.from(skillPositions.values()).map(p => p.x);
        const ys = Array.from(skillPositions.values()).map(p => p.y);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

        setPanOffset({
          x: 600 / 2 - centerX * zoomLevel,
          y: 400 / 2 - centerY * zoomLevel,
        });
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [filteredSkills.length, layoutMode]);

  const getCategoryColor = (category) => {
    const colors = {
      Programming: '#3b82f6',
      Framework: '#f59e0b',
      Backend: '#10b981',
      Design: '#ec4899',
      API: '#6366f1',
    };
    return colors[category] || '#9ca3af';
  };

  return (
    <div className="relative overflow-hidden" style={{ height: 800, width: '100%' }}>
      <svg
        width={containerDimensions.width}
        height={containerDimensions.height}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0'
        }}
      >
        {skillEdges.map(edge => {
          const from = skillPositions.get(edge.prerequisite_skill_id);
          const to = skillPositions.get(edge.skill_id);
          if (!from || !to) return null;
          return (
            <path
              key={`${edge.prerequisite_skill_id}-${edge.skill_id}`}
              d={`M ${from.x + 50} ${from.y + 80} C ${from.x + 50} ${from.y + 120}, ${to.x + 50} ${to.y - 40}, ${to.x + 50} ${to.y}`}
              stroke="#888"
              fill="transparent"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
          );
        })}
        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#888" />
          </marker>
        </defs>
      </svg>

      {filteredSkills.map(skill => {
        const position = skillPositions.get(skill.id);
        if (!position) return null;
        const progress = userProgress.find(p => p.skill_id === skill.id);
        return (
          <SkillTreeNode
            key={skill.id}
            skill={skill}
            userProgress={progress}
            position={position}
            onClick={() => onSkillClick(skill)}
            categoryColor={getCategoryColor(skill.category)}
          />
        );
      })}
    </div>
  );
};