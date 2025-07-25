-- Enhanced Smart Alert System - Milestone 4

-- Create alert_configurations table for custom alert rules
CREATE TABLE public.alert_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'threshold', 'pattern', 'anomaly', 'predictive'
  career_path TEXT NOT NULL,
  location TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'salary', 'demand', 'growth', 'competition'
  threshold_value NUMERIC,
  comparison_operator TEXT NOT NULL DEFAULT '>', -- '>', '<', '>=', '<=', '=', '!=', 'change_%'
  time_window TEXT NOT NULL DEFAULT '7d', -- '1d', '7d', '30d', '90d'
  pattern_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_history table for tracking alert performance
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID NOT NULL REFERENCES public.alert_configurations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  alert_message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_taken TEXT, -- 'dismissed', 'saved', 'shared', 'explored'
  confidence_score NUMERIC DEFAULT 0.8,
  false_positive BOOLEAN DEFAULT false,
  user_feedback_rating INTEGER, -- 1-5 rating from user
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_performance_metrics table
CREATE TABLE public.alert_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID NOT NULL REFERENCES public.alert_configurations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_alerts INTEGER DEFAULT 0,
  relevant_alerts INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  accuracy_rate NUMERIC DEFAULT 0.0,
  user_engagement_score NUMERIC DEFAULT 0.0,
  avg_response_time_hours NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_preferences table for detailed notification settings
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  max_daily_alerts INTEGER DEFAULT 10,
  priority_threshold TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  grouping_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_configurations
CREATE POLICY "Users can manage their own alert configurations" 
ON public.alert_configurations 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all alert configurations" 
ON public.alert_configurations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for alert_history
CREATE POLICY "Users can view their own alert history" 
ON public.alert_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert history" 
ON public.alert_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all alert history" 
ON public.alert_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for alert_performance_metrics
CREATE POLICY "Users can view their own alert performance metrics" 
ON public.alert_performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all alert performance metrics" 
ON public.alert_performance_metrics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_alert_configurations_user_active ON public.alert_configurations(user_id, is_active);
CREATE INDEX idx_alert_configurations_career_location ON public.alert_configurations(career_path, location);
CREATE INDEX idx_alert_history_user_triggered ON public.alert_history(user_id, triggered_at DESC);
CREATE INDEX idx_alert_history_config_id ON public.alert_history(alert_config_id);
CREATE INDEX idx_alert_performance_user_period ON public.alert_performance_metrics(user_id, period_start, period_end);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_alert_configurations_updated_at
  BEFORE UPDATE ON public.alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate alert accuracy
CREATE OR REPLACE FUNCTION public.calculate_alert_accuracy(config_id UUID, days_back INTEGER DEFAULT 30)
RETURNS NUMERIC
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH alert_stats AS (
    SELECT 
      COUNT(*) as total_alerts,
      COUNT(*) FILTER (WHERE false_positive = false) as relevant_alerts,
      COUNT(*) FILTER (WHERE user_feedback_rating >= 4) as positive_feedback
    FROM public.alert_history
    WHERE alert_config_id = config_id 
      AND triggered_at >= now() - (days_back || ' days')::interval
  )
  SELECT 
    CASE 
      WHEN total_alerts = 0 THEN 0.0
      ELSE ROUND((relevant_alerts::NUMERIC + positive_feedback::NUMERIC) / (total_alerts::NUMERIC * 2) * 100, 2)
    END
  FROM alert_stats;
$$;