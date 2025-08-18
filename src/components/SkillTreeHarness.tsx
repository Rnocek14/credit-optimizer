import React from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const HARNESS_NODES = [
  {
    id: "h1",
    type: "default",
    position: { x: 120, y: 120 },
    data: { 
      label: "🌱 Harness Node", 
      "data-testid": "skill-node", 
      "data-node-id": "h1" 
    },
  },
  {
    id: "h2", 
    type: "default",
    position: { x: 350, y: 120 },
    data: { 
      label: "🔧 Pipeline Test", 
      "data-testid": "skill-node", 
      "data-node-id": "h2" 
    },
  },
];

export default function SkillTreeHarness() {
  console.log("🧪 SkillTreeHarness rendering with nodes:", HARNESS_NODES.length);
  
  return (
    <div 
      data-testid="skill-tree-canvas" 
      className="w-full h-[800px] min-h-[800px] overflow-hidden"
      style={{ height: 800, minHeight: 800 }}
    >
      <ReactFlow 
        nodes={HARNESS_NODES} 
        edges={[]} 
        fitView
        className="w-full h-full"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}