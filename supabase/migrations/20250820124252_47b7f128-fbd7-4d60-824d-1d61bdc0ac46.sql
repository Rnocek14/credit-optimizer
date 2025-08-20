-- Add seed data for age penalty curves
INSERT INTO age_penalty_curves (age_min, age_max, penalty_factor, notes) 
VALUES
  (18, 29, 1.00, 'Prime switching window'),
  (30, 34, 1.05, 'Minor ramp penalty'),
  (35, 39, 1.12, 'Moderate ramp + signaling'),
  (40, 44, 1.20, 'Higher payback time'),
  (45, 49, 1.30, 'Significant ramp + market bias'),
  (50, 99, 1.45, 'Highest ramp + slower ROI')
ON CONFLICT (age_min, age_max) DO NOTHING;

-- Add sample skill automation risk data
INSERT INTO career_graph_nodes (id, node_type, title, description, automation_risk_pct) 
VALUES
  (gen_random_uuid(), 'skill', 'Excel Analysis', 'Basic spreadsheet analysis and reporting', 65),
  (gen_random_uuid(), 'skill', 'Python Data Analysis', 'Data analysis using Python libraries', 25), 
  (gen_random_uuid(), 'skill', 'React Frontend', 'Frontend development with React', 20),
  (gen_random_uuid(), 'skill', 'UX Research', 'User experience research and testing', 15),
  (gen_random_uuid(), 'skill', 'Customer Interviews', 'Conducting customer discovery interviews', 10)
ON CONFLICT (id) DO NOTHING;

-- Create function to get age penalty factor correctly
CREATE OR REPLACE FUNCTION get_age_penalty(p_age integer)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT penalty_factor 
    FROM age_penalty_curves 
    WHERE p_age BETWEEN age_min AND age_max 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;