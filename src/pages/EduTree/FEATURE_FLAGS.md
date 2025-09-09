# EduTree Feature Flags

This document explains the EduTree feature flags and how to use them for safe rollout.

## Staggered Edges V2 (`eduTreeStaggeredEdgesV2`)

### Purpose
Fixes the broken edge batching system that was causing "disconnected nodes" by using position-based column detection instead of `parseInt()` on node IDs.

### Usage
```
# Enable V2 staggered edges
?eduTreeStaggeredEdgesV2=true

# Disable (rollback to legacy)
?eduTreeStaggeredEdgesV2=false
```

### Features
- **Position-based batching**: Uses actual node X coordinates instead of parsing IDs
- **Terminal edge handling**: Ensures graduation terminal edges are always visible
- **Small graph fallback**: Shows all edges immediately for graphs with <6 edges or <2 columns
- **Error recovery**: Falls back to showing all edges if batching fails
- **Proper cleanup**: Prevents memory leaks and stuck transitions

### Testing Checklist
- [ ] Normal SE degree (many blocks): edges reveal left→right
- [ ] Small graphs: no staggering, immediate edge visibility
- [ ] Non-numeric node IDs: "placeholder-42", "graduation-terminal" work correctly
- [ ] Flow ↔ Board toggle: edges re-batch correctly after re-layout
- [ ] Terminal visibility: graduation node always in view with proper edges
- [ ] Error handling: fallback works if batching throws errors

### Quick Tests
1. **Normal flow**: Load page, watch edges reveal in staggered batches
2. **Rollback test**: Toggle flag off, reload, edges show immediately
3. **Error simulation**: Break a node ID, verify fallback triggers
4. **Terminal test**: Pan to graduation node, verify dashed edges visible

### Debug Information
When `NODE_ENV=development`, the system logs:
- Edge batching decisions
- Column calculations
- Fallback triggers
- Error conditions

### Rollback Plan
If issues occur:
1. Set `?eduTreeStaggeredEdgesV2=false` in URL
2. Or toggle off the switch in dev mode
3. System falls back to legacy parseInt() batching
4. No code changes required for rollback