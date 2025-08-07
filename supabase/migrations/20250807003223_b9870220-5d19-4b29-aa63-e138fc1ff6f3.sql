-- Phase 3.5: Social Learning & Peer Feedback System

-- Study Groups Table
CREATE TABLE public.study_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL,
  career_path TEXT NOT NULL,
  skill_focus TEXT[],
  max_members INTEGER DEFAULT 8,
  privacy_level TEXT NOT NULL DEFAULT 'public' CHECK (privacy_level IN ('public', 'invite_only', 'private')),
  group_type TEXT NOT NULL DEFAULT 'general' CHECK (group_type IN ('general', 'study_challenge', 'project_based', 'mentor_led')),
  active_challenge_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Study Group Members
CREATE TABLE public.study_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'leader')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  contribution_score NUMERIC DEFAULT 0,
  UNIQUE(group_id, user_id)
);

-- Learning Challenges
CREATE TABLE public.learning_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'individual' CHECK (challenge_type IN ('individual', 'team', 'group', 'global')),
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  skill_focus TEXT[],
  career_paths TEXT[],
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  badge_reward_id UUID,
  max_participants INTEGER,
  entry_requirements JSONB DEFAULT '{}',
  challenge_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge Participants
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.learning_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_name TEXT,
  registration_data JSONB DEFAULT '{}',
  progress_data JSONB DEFAULT '{}',
  completion_status TEXT NOT NULL DEFAULT 'registered' CHECK (completion_status IN ('registered', 'in_progress', 'completed', 'withdrawn')),
  final_score NUMERIC,
  completed_at TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Peer Learning Sessions
CREATE TABLE public.peer_learning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'study' CHECK (session_type IN ('study', 'project_review', 'discussion', 'practice')),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER DEFAULT 6,
  session_data JSONB DEFAULT '{}',
  organizer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session Participants
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.peer_learning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'no_show')),
  contribution_rating NUMERIC CHECK (contribution_rating >= 1 AND contribution_rating <= 5),
  feedback TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Peer Feedback
CREATE TABLE public.peer_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('skill_validation', 'project_review', 'learning_progress', 'collaboration')),
  context_type TEXT NOT NULL CHECK (context_type IN ('study_group', 'challenge', 'session', 'general')),
  context_id UUID,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  skills_endorsed TEXT[],
  improvement_areas TEXT[],
  is_anonymous BOOLEAN DEFAULT false,
  feedback_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Social Learning Analytics
CREATE TABLE public.social_learning_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_data JSONB DEFAULT '{}',
  calculation_period TEXT NOT NULL DEFAULT 'weekly' CHECK (calculation_period IN ('daily', 'weekly', 'monthly')),
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Leaderboards
CREATE TABLE public.social_leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('global_xp', 'career_path', 'skill_specific', 'group_contribution', 'challenge_winner')),
  scope_filter JSONB DEFAULT '{}', -- career_path, skill, group_id, etc.
  time_period TEXT NOT NULL DEFAULT 'monthly' CHECK (time_period IN ('weekly', 'monthly', 'quarterly', 'all_time')),
  leaderboard_data JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Study Groups
CREATE POLICY "Users can view public study groups" ON public.study_groups FOR SELECT USING (privacy_level = 'public' OR creator_id = auth.uid());
CREATE POLICY "Users can create study groups" ON public.study_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Group creators can update their groups" ON public.study_groups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Service role can manage study groups" ON public.study_groups FOR ALL USING (true);

-- RLS Policies for Group Members
CREATE POLICY "Users can view group members for groups they belong to" ON public.study_group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.study_group_members sgm WHERE sgm.group_id = study_group_members.group_id AND sgm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.study_groups sg WHERE sg.id = study_group_members.group_id AND sg.privacy_level = 'public')
);
CREATE POLICY "Users can join groups" ON public.study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.study_group_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage group members" ON public.study_group_members FOR ALL USING (true);

-- RLS Policies for Learning Challenges
CREATE POLICY "Anyone can view active challenges" ON public.learning_challenges FOR SELECT USING (status IN ('upcoming', 'active'));
CREATE POLICY "Service role can manage challenges" ON public.learning_challenges FOR ALL USING (true);

-- RLS Policies for Challenge Participants
CREATE POLICY "Users can view challenge participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can participate in challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage participants" ON public.challenge_participants FOR ALL USING (true);

-- RLS Policies for Peer Learning Sessions
CREATE POLICY "Users can view sessions for groups they belong to" ON public.peer_learning_sessions FOR SELECT USING (
  group_id IS NULL OR EXISTS (SELECT 1 FROM public.study_group_members sgm WHERE sgm.group_id = peer_learning_sessions.group_id AND sgm.user_id = auth.uid())
);
CREATE POLICY "Users can create sessions" ON public.peer_learning_sessions FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update their sessions" ON public.peer_learning_sessions FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Service role can manage sessions" ON public.peer_learning_sessions FOR ALL USING (true);

-- RLS Policies for Session Participants
CREATE POLICY "Users can view session participants" ON public.session_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.peer_learning_sessions pls WHERE pls.id = session_participants.session_id AND (
    pls.organizer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.session_participants sp WHERE sp.session_id = pls.id AND sp.user_id = auth.uid())
  ))
);
CREATE POLICY "Users can register for sessions" ON public.session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON public.session_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage session participants" ON public.session_participants FOR ALL USING (true);

-- RLS Policies for Peer Feedback
CREATE POLICY "Users can view feedback they gave or received" ON public.peer_feedback FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can give feedback" ON public.peer_feedback FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Service role can manage feedback" ON public.peer_feedback FOR ALL USING (true);

-- RLS Policies for Social Learning Analytics
CREATE POLICY "Users can view their own analytics" ON public.social_learning_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage analytics" ON public.social_learning_analytics FOR ALL USING (true);

-- RLS Policies for Leaderboards
CREATE POLICY "Anyone can view leaderboards" ON public.social_leaderboards FOR SELECT USING (true);
CREATE POLICY "Service role can manage leaderboards" ON public.social_leaderboards FOR ALL USING (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_study_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION update_study_groups_updated_at();

CREATE TRIGGER update_learning_challenges_updated_at
  BEFORE UPDATE ON public.learning_challenges
  FOR EACH ROW EXECUTE FUNCTION update_study_groups_updated_at();

CREATE TRIGGER update_peer_learning_sessions_updated_at
  BEFORE UPDATE ON public.peer_learning_sessions
  FOR EACH ROW EXECUTE FUNCTION update_study_groups_updated_at();