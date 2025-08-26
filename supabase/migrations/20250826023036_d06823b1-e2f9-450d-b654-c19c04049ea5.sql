-- Insert test context tracking data for dev user Aisha
INSERT INTO public.maya_context_tracking (user_id, context_type, event_type, context_data) VALUES 
('2b458624-d498-4cca-a63d-9341cc20e363', 'page_visit', 'navigation', '{"path": "/today", "timestamp": "2025-08-26T02:30:00Z", "user_agent": "test"}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'goal_interaction', 'progress_update', '{"goal_id": "test", "progress": 25, "timestamp": "2025-08-26T02:29:00Z"}'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'course_engagement', 'module_completed', '{"module": "React Fundamentals", "timestamp": "2025-08-26T02:28:00Z"}');