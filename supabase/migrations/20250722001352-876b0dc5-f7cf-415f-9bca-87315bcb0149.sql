-- Add comprehensive skill prerequisite relationships for proper hierarchical layout

-- Clear existing edges to avoid conflicts
DELETE FROM public.skill_graph_edges;

-- Define prerequisite relationships based on logical learning progression

-- Foundation: HTML → CSS → JavaScript progression
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'CSS'),
  (SELECT id FROM public.skills WHERE name = 'HTML')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'CSS') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'HTML');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'JavaScript'),
  (SELECT id FROM public.skills WHERE name = 'CSS')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'CSS');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Tailwind'),
  (SELECT id FROM public.skills WHERE name = 'CSS')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Tailwind') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'CSS');

-- Programming progression: JavaScript → TypeScript
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'TypeScript'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'TypeScript') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

-- Framework progression: JavaScript → React → Advanced React
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'React'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'React') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'React Basics'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'React Basics') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Advanced React'),
  (SELECT id FROM public.skills WHERE name = 'React')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Advanced React') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'React');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Next.js'),
  (SELECT id FROM public.skills WHERE name = 'React')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Next.js') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'React');

-- Backend progression: JavaScript → Node.js
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Node.js'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Node.js') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

-- API progression: JavaScript → APIs → GraphQL
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'APIs'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'APIs') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'GraphQL'),
  (SELECT id FROM public.skills WHERE name = 'APIs')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'GraphQL') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'APIs');

-- Design progression: Empathy → UX Fundamentals → Wireframing → Advanced Design
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'UX Fundamentals'),
  (SELECT id FROM public.skills WHERE name = 'Empathy')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'UX Fundamentals') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Empathy');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Wireframing'),
  (SELECT id FROM public.skills WHERE name = 'UX Fundamentals')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Wireframing') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'UX Fundamentals');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Figma'),
  (SELECT id FROM public.skills WHERE name = 'Wireframing')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Figma') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Wireframing');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Design Systems'),
  (SELECT id FROM public.skills WHERE name = 'UX Fundamentals')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Design Systems') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'UX Fundamentals');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Responsive Design'),
  (SELECT id FROM public.skills WHERE name = 'CSS')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Responsive Design') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'CSS');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Accessibility'),
  (SELECT id FROM public.skills WHERE name = 'UX Fundamentals')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Accessibility') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'UX Fundamentals');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Interaction Design'),
  (SELECT id FROM public.skills WHERE name = 'Design Systems')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Interaction Design') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Design Systems');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Advanced Prototyping'),
  (SELECT id FROM public.skills WHERE name = 'Interaction Design')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Advanced Prototyping') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Interaction Design');

-- DevOps progression: Git → Docker
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Docker'),
  (SELECT id FROM public.skills WHERE name = 'Git')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Docker') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Git');

-- Cloud progression: Node.js → AWS
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'AWS'),
  (SELECT id FROM public.skills WHERE name = 'Node.js')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'AWS') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Node.js');

-- Quality progression: JavaScript → Testing
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Testing'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Testing') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Web Performance'),
  (SELECT id FROM public.skills WHERE name = 'JavaScript')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Web Performance') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'JavaScript');

-- Product progression: Stakeholder Communication → Agile → Advanced Product
INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Agile'),
  (SELECT id FROM public.skills WHERE name = 'Stakeholder Communication')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Agile') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Stakeholder Communication');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Jira'),
  (SELECT id FROM public.skills WHERE name = 'Agile')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Jira') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Agile');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Prioritization'),
  (SELECT id FROM public.skills WHERE name = 'Stakeholder Communication')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Prioritization') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Stakeholder Communication');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'MVP Strategy'),
  (SELECT id FROM public.skills WHERE name = 'Prioritization')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'MVP Strategy') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Prioritization');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Roadmapping'),
  (SELECT id FROM public.skills WHERE name = 'MVP Strategy')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Roadmapping') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'MVP Strategy');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Data Analysis'),
  (SELECT id FROM public.skills WHERE name = 'Prioritization')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Data Analysis') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Prioritization');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Growth Hacking'),
  (SELECT id FROM public.skills WHERE name = 'Data Analysis')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Growth Hacking') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Data Analysis');

INSERT INTO public.skill_graph_edges (skill_id, prerequisite_skill_id)
SELECT 
  (SELECT id FROM public.skills WHERE name = 'Market Sizing'),
  (SELECT id FROM public.skills WHERE name = 'Data Analysis')
WHERE EXISTS (SELECT 1 FROM public.skills WHERE name = 'Market Sizing') 
  AND EXISTS (SELECT 1 FROM public.skills WHERE name = 'Data Analysis');