INSERT INTO public.career_paths (
  title, summary, industry, level, average_salary, growth_outlook, 
  key_skills, education_required, certifications, common_entry_roles, advanced_roles
) VALUES (
  '3D Printing Specialist',
  'Design, prototype, and manufacture objects using 3D printing technologies for applications in engineering, healthcare, design, and education.',
  'Engineering',
  'Entry',
  67000,
  'Faster than average',
  ARRAY[
    'CAD Modeling',
    'Additive Manufacturing',
    '3D Printing Software',
    'Printer Maintenance',
    'Slicing Software',
    'Rapid Prototyping',
    'Material Science',
    'Problem Solving'
  ],
  'Associate or Bachelor''s in Engineering, Industrial Design, or related field',
  ARRAY[
    'Certified Additive Manufacturing Technician (CAM-T)',
    'SolidWorks Certification',
    'Autodesk Fusion 360 Certification',
    '3D Printing Specialization (Coursera)'
  ],
  ARRAY[
    '3D Print Technician',
    'Prototyping Assistant',
    'CAD Drafter',
    'Fabrication Lab Assistant'
  ],
  ARRAY[
    '3D Printing Engineer',
    'Additive Manufacturing Specialist',
    'Product Development Engineer',
    'R&D Fabrication Lead'
  ]
);