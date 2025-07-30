-- Enable real-time updates for maya_decisions table
ALTER TABLE public.maya_decisions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.maya_decisions;