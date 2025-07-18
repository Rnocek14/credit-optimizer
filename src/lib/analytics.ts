import { supabase } from '@/integrations/supabase/client'

export type AnalyticsEvent = 
  | 'resume_view'
  | 'resume_click' 
  | 'gallery_impression'
  | 'embed_interaction'
  | 'mentor_feedback_submitted'
  | 'cta_click'
  | 'share_resume'

export interface AnalyticsMetadata {
  device?: string
  location?: string
  referrer?: string
  resume_id?: string
  embed_size?: string
  embed_theme?: string
  button_type?: string
  [key: string]: any
}

export async function trackEvent(
  userId: string,
  eventType: AnalyticsEvent,
  source?: string,
  metadata?: AnalyticsMetadata
) {
  try {
    const { error } = await supabase
      .from('resume_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        source: source || 'unknown',
        metadata: {
          timestamp: Date.now(),
          user_agent: navigator.userAgent,
          url: window.location.href,
          ...metadata
        }
      })

    if (error) {
      console.error('Analytics tracking error:', error)
    }
  } catch (err) {
    console.error('Failed to track event:', err)
  }
}

export function useAnalytics() {
  return {
    trackResumeView: (userId: string, source: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'resume_view', source, metadata),
    
    trackResumeClick: (userId: string, source: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'resume_click', source, metadata),
    
    trackGalleryImpression: (userId: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'gallery_impression', 'gallery', metadata),
    
    trackEmbedInteraction: (userId: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'embed_interaction', 'embed', metadata),
    
    trackMentorFeedback: (userId: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'mentor_feedback_submitted', 'mentor_inbox', metadata),
    
    trackCTAClick: (userId: string, source: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'cta_click', source, metadata),
    
    trackShareResume: (userId: string, source: string, metadata?: AnalyticsMetadata) => 
      trackEvent(userId, 'share_resume', source, metadata)
  }
}