-- Phase 4: Maya Universal Intelligence - Conversation Memory Tables

-- Conversation sessions to track user conversations across features
CREATE TABLE public.conversation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual messages within conversation sessions
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_sessions
CREATE POLICY "Users can manage their own conversation sessions"
ON public.conversation_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversation sessions"
ON public.conversation_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for conversation_messages  
CREATE POLICY "Users can manage messages in their own sessions"
ON public.conversation_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_sessions 
    WHERE conversation_sessions.id = conversation_messages.session_id 
    AND conversation_sessions.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_sessions 
    WHERE conversation_sessions.id = conversation_messages.session_id 
    AND conversation_sessions.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all conversation messages"
ON public.conversation_messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_conversation_sessions_user_feature ON public.conversation_sessions(user_id, feature);
CREATE INDEX idx_conversation_sessions_active ON public.conversation_sessions(is_active, last_activity_at);
CREATE INDEX idx_conversation_messages_session ON public.conversation_messages(session_id, created_at);
CREATE INDEX idx_conversation_messages_content_search ON public.conversation_messages USING gin(to_tsvector('english', content));