-- First, let's add some sample course data
INSERT INTO recommended_courses (id, mentor_id, title, platform, url, difficulty, cost, description, skill_tags, is_ai_recommended, active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000000', 'JavaScript Fundamentals', 'freeCodeCamp', 'https://freecodecamp.org/javascript', 'Beginner', 'Free', 'Learn the basics of JavaScript programming', ARRAY['javascript', 'programming'], true, true),
('550e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000000', 'React Complete Guide', 'Udemy', 'https://udemy.com/react-guide', 'Intermediate', '$89', 'Master React from basics to advanced concepts', ARRAY['react', 'frontend'], true, true),
('550e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000000', 'Node.js for Beginners', 'Pluralsight', 'https://pluralsight.com/nodejs', 'Beginner', '$29/month', 'Introduction to server-side JavaScript with Node.js', ARRAY['nodejs', 'backend'], true, true),
('550e8400-e29b-41d4-a716-446655440004', '00000000-0000-0000-0000-000000000000', 'TypeScript Essential Training', 'LinkedIn Learning', 'https://linkedin.com/typescript', 'Intermediate', '$29.99/month', 'Master TypeScript for better JavaScript development', ARRAY['typescript', 'programming'], true, true),
('550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'CSS Grid and Flexbox', 'CSS-Tricks', 'https://css-tricks.com/snippets/css/complete-guide-grid/', 'Beginner', 'Free', 'Complete guide to modern CSS layout techniques', ARRAY['css', 'styling'], true, true),
('550e8400-e29b-41d4-a716-446655440006', '00000000-0000-0000-0000-000000000000', 'HTML5 Semantic Markup', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/docs/Web/HTML', 'Beginner', 'Free', 'Learn semantic HTML5 for better web structure', ARRAY['html', 'markup'], true, true),
('550e8400-e29b-41d4-a716-446655440007', '00000000-0000-0000-0000-000000000000', 'AWS Cloud Practitioner', 'AWS Training', 'https://aws.amazon.com/training/', 'Intermediate', '$100', 'Introduction to Amazon Web Services cloud platform', ARRAY['aws', 'cloud'], true, true),
('550e8400-e29b-41d4-a716-446655440008', '00000000-0000-0000-0000-000000000000', 'Docker Fundamentals', 'Docker', 'https://docker.com/get-started', 'Intermediate', 'Free', 'Learn containerization with Docker', ARRAY['docker', 'devops'], true, true),
('550e8400-e29b-41d4-a716-446655440009', '00000000-0000-0000-0000-000000000000', 'Next.js Full Stack', 'Vercel', 'https://nextjs.org/learn', 'Advanced', 'Free', 'Build full-stack applications with Next.js', ARRAY['nextjs', 'framework'], true, true),
('550e8400-e29b-41d4-a716-446655440010', '00000000-0000-0000-0000-000000000000', 'GraphQL Complete Guide', 'GraphQL Foundation', 'https://graphql.org/learn/', 'Advanced', 'Free', 'Master GraphQL for modern APIs', ARRAY['graphql', 'api'], true, true),
('550e8400-e29b-41d4-a716-446655440011', '00000000-0000-0000-0000-000000000000', 'Testing with Jest & Cypress', 'Testing Library', 'https://testing-library.com/', 'Intermediate', 'Free', 'Learn automated testing for JavaScript applications', ARRAY['testing', 'quality'], true, true),
('550e8400-e29b-41d4-a716-446655440012', '00000000-0000-0000-0000-000000000000', 'Design Systems Fundamentals', 'Design Systems Repo', 'https://designsystemsrepo.com/', 'Intermediate', '$49', 'Create and maintain scalable design systems', ARRAY['design-systems', 'design'], true, true);

-- Now map courses to skills
INSERT INTO course_skill_map (skill_id, course_id) VALUES
-- JavaScript courses
('7bafbd32-0607-4d8a-a797-21f423c31301', '550e8400-e29b-41d4-a716-446655440001'),
-- TypeScript courses  
('36dbeb35-5baa-4280-bc76-f3c0d92e2574', '550e8400-e29b-41d4-a716-446655440004'),
-- React courses
('8cb47168-b948-4fa8-bb07-7a505075c1bd', '550e8400-e29b-41d4-a716-446655440002'),
-- Node.js courses
('7174c7f8-1e82-445b-b52c-ebe879da037a', '550e8400-e29b-41d4-a716-446655440003'),
-- CSS courses
('01910319-a9a4-4ae7-b3ac-04a27dc4d205', '550e8400-e29b-41d4-a716-446655440005'),
-- HTML courses
('45c91b3d-f21c-4111-81be-f9c486e23174', '550e8400-e29b-41d4-a716-446655440006'),
-- AWS courses
('27932cc5-5ba7-4080-b998-709709cbae11', '550e8400-e29b-41d4-a716-446655440007'),
-- Docker courses
('0fd92be6-3f68-4563-8175-6d7099ce5b8c', '550e8400-e29b-41d4-a716-446655440008'),
-- Next.js courses
('ec122b3e-cc07-48cf-8a9c-c7438e8b11c6', '550e8400-e29b-41d4-a716-446655440009'),
-- GraphQL courses
('9d18f66e-a0e3-4884-b6de-fb4a8f4c7da2', '550e8400-e29b-41d4-a716-446655440010'),
-- Testing courses
('44e97e10-4f28-4d3a-b7ae-7cd15dd2f9b7', '550e8400-e29b-41d4-a716-446655440011'),
-- Design Systems courses
('f5ffd95e-50f2-4dbd-bcb2-a04d0cb354fb', '550e8400-e29b-41d4-a716-446655440012');