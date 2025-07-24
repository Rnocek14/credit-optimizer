-- Update career_graph_edges edge_type constraint to support new edge types for orphaned node reconnection
ALTER TABLE career_graph_edges
  DROP CONSTRAINT IF EXISTS career_graph_edges_edge_type_check;

ALTER TABLE career_graph_edges
  ADD CONSTRAINT career_graph_edges_edge_type_check
  CHECK (
    edge_type IN (
      'teaches',
      'supports', 
      'requires',
      'leads_to',
      'validates',
      'qualifies_for'
    )
  );