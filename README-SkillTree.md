# Skill Tree System Documentation

## Overview

The Skill Tree system provides a visual representation of career progression paths, showing relationships between skills, courses, projects, jobs, and certifications. It features advanced layout algorithms, filtering capabilities, and performance optimizations.

## Architecture

### Core Components

1. **EnhancedSkillTreeLayout** (`src/lib/enhancedSkillTreeLayout.ts`)
   - Advanced layout algorithms (semantic hierarchy, category clustering, goal-focused)
   - Depth-based positioning with collision detection
   - Orphan node handling and cycle detection

2. **UnifiedCareerCanvas** (`src/components/UnifiedCareerCanvas.tsx`)
   - React Flow integration for rendering
   - Performance optimization with memoization
   - Edge styling and node positioning

3. **SemanticSkillNode** (`src/components/semantic/SemanticSkillNode.tsx`)
   - Individual node rendering with trust signals
   - CRI badges, difficulty rings, instructor ratings
   - Outcome tags and verification status

4. **SkillTreeFilters** (`src/components/SkillTreeFilters.tsx`)
   - Filter UI for verified skills, tracks, and goal paths
   - Real-time filtering with performance monitoring
   - URL state persistence

## Layout Algorithm

### Depth Calculation

The system uses a topological sort with longest-path refinement:

```typescript
// Base positioning uses depth, not index
const baseY = 120 + depth * LAYER_GAP; // LAYER_GAP = 180px
const finalY = baseY + (typeIndex * GROUP_Y_OFFSET); // GROUP_Y_OFFSET = 35px
```

### Key Constants

- `LAYER_GAP`: 180px - Vertical spacing between depth levels
- `GROUP_Y_OFFSET`: 35px - Small offset for type grouping within depth
- `nodeWidth`: 170px - Standard node width
- `nodeHeight`: 100px - Standard node height
- `minSpacing`: 50px - Minimum space between nodes

### Special Handling

- **Orphan Nodes**: Nodes with no edges are placed at depth 999 (bottom)
- **Cycles**: Detected and handled with fallback grid positioning
- **Collision Detection**: Automatic spacing adjustment to prevent overlaps

## Data Structure

### Node Types

```typescript
interface LayoutNode {
  id: string;
  type: 'skill' | 'job' | 'course' | 'project' | 'certification' | 'step';
  title: string;
  category?: string;
  level?: number;
  data?: any;
}
```

### Edge Types

```typescript
interface LayoutEdge {
  source: string;
  target: string;
  type: 'teaches' | 'requires' | 'qualifies_for' | 'supports' | 'prerequisite';
}
```

### Trust Signals

Nodes display various trust signals:
- **CRI Score**: Career Readiness Index (0-100)
- **Difficulty Ring**: Visual difficulty indicator (1-10)
- **Instructor Rating**: Star rating (0-5.0)
- **Verification Status**: Green checkmark for verified skills
- **Outcome Tags**: Labels like "Resume", "Capstone", etc.

## Performance Guidelines

### Layout Performance Budgets

- **Small graphs** (≤12 nodes): ≤100ms
- **Medium graphs** (≤60 nodes): ≤250ms  
- **Large graphs** (≤150 nodes): ≤450ms

### Optimization Techniques

1. **Memoization**: Layout recalculation only when graph hash changes
2. **Stable FitView**: Triggered only after layout completion
3. **Deferred Rendering**: Off-screen badges rendered on demand
4. **Throttled Events**: Pan/zoom handlers throttled for smooth interaction

### Monitoring

```javascript
// Layout timing
const startTime = performance.now();
const result = calculateLayout(nodes, edges);
const duration = performance.now() - startTime;
console.log(`Layout completed in ${duration.toFixed(2)}ms`);
```

## Filter System

### Filter Types

1. **Verified Only**: Shows only skills with `verified: true`
2. **By Track**: Filters nodes by track association
3. **Goal Path Only**: Shows only nodes in the goal path

### Implementation

```typescript
// Filter predicates
const verifiedNodes = nodes.filter(node => 
  !verifiedOnly || node.userProgress?.verified === true
);

const trackNodes = verifiedNodes.filter(node =>
  !selectedTrack || node.track_id === selectedTrack
);

const goalNodes = trackNodes.filter(node =>
  !goalPathOnly || goalPath.includes(node.id)
);
```

## Mobile Support

### Responsive Design

- **Tap Targets**: Minimum 44x44px for mobile interaction
- **Mobile Component**: `SkillTreeMobile.tsx` for touch-optimized experience
- **Gesture Support**: Pan/zoom with touch gestures

### Accessibility

- **Keyboard Navigation**: Arrow keys move between nodes
- **Screen Reader**: ARIA labels and live regions
- **Focus Management**: Proper focus ring and tab order
- **High Contrast**: Supports high contrast mode

## Adding New Features

### New Edge Types

1. Add to edge type mapping:
```typescript
const mapEdgeType = (edgeType: string) => {
  const mapping = {
    'teaches': 'teaches',
    'your_new_type': 'supports', // Map to existing or add new
    // ...
  };
  return mapping[edgeType] || 'supports';
};
```

2. Add styling:
```typescript
const getEdgeColor = (edgeType: string) => {
  const colors = {
    your_new_type: '#ff6b6b', // Your color
    // ...
  };
  return colors[edgeType] || '#6b7280';
};
```

### New Trust Signals

1. Add to node data structure
2. Create badge component in `SemanticSkillNode.tsx`
3. Update rendering logic

### New Layout Algorithms

1. Add algorithm option to `LayoutConfig`
2. Implement calculation method in `EnhancedSkillTreeLayout`
3. Add to switch statement in `calculateLayout()`

## Testing

### Unit Tests

```bash
npm test -- skillTreeLayout.test.ts
```

### E2E Tests

```bash
npx cypress run --spec "cypress/e2e/skillTreeFilters.cy.ts"
```

### Performance Testing

```javascript
// Test layout performance
describe('Performance', () => {
  it('should handle medium graphs efficiently', () => {
    const startTime = performance.now();
    calculateEnhancedSkillTreeLayout(mediumNodes, mediumEdges);
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(250);
  });
});
```

## Troubleshooting

### Common Issues

1. **Nodes at Same Y Level**
   - Check depth calculation logic
   - Verify `LAYER_GAP` is properly applied
   - Ensure edges are properly directed

2. **Poor Performance**
   - Check for unnecessary re-renders
   - Verify memoization dependencies
   - Monitor layout calculation time

3. **Filter Not Working**
   - Check filter predicate logic
   - Verify data structure matches expectations
   - Test with small dataset first

### Debug Tools

```javascript
// Enable layout debugging
console.log('🎨 Positioning layers with depths:', sortedDepths);
console.log(`📍 Depth ${depth} positioned at baseY: ${baseY}`);
```

### Performance Monitoring

```javascript
// Monitor frame rate during pan/zoom
let frameCount = 0;
const startTime = Date.now();

function checkFPS() {
  frameCount++;
  if (frameCount % 60 === 0) {
    const fps = 60000 / (Date.now() - startTime);
    console.log(`FPS: ${fps.toFixed(1)}`);
  }
  requestAnimationFrame(checkFPS);
}
requestAnimationFrame(checkFPS);
```

## Migration Guide

### From Old System

1. Replace layout calculation calls
2. Update node data structure
3. Add trust signal components
4. Implement filter system
5. Update tests

### Breaking Changes

- Node positioning now depth-based (Y coordinates will change)
- Edge direction normalization required
- Filter props now required for components
- Mobile components separated from desktop

## Future Enhancements

- [ ] WebGL rendering for large graphs (1000+ nodes)
- [ ] Real-time collaborative editing
- [ ] Export to image/PDF functionality
- [ ] Advanced analytics and insights
- [ ] AI-powered layout optimization
- [ ] Virtual reality skill tree exploration