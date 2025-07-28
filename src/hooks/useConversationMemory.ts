import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    careerPath?: string;
    location?: string;
    activeTab?: string;
    workflowExecuted?: string;
  };
  metadata?: {
    tokens?: number;
    model?: string;
    workflowResults?: any;
  };
}

interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  lastActivityAt: string;
  context: {
    careerPath?: string;
    location?: string;
    activeFeature?: string;
  };
}

/**
 * Phase 4: Maya Universal Intelligence - Conversation Memory Hook
 * 
 * Provides persistent conversation memory across sessions and features.
 * Maya can reference past conversations, track user preferences, and
 * provide contextual responses based on conversation history.
 */
export function useConversationMemory(userId?: string, feature: string = 'general') {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or resume conversation session
  useEffect(() => {
    if (!userId) return;
    
    initializeSession();
  }, [userId, feature]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to find an existing active session for this feature
      const { data: existingSessions } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('feature', feature)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })
        .limit(1);

      let session: ConversationSession;

      if (existingSessions && existingSessions.length > 0) {
        // Resume existing session
        session = existingSessions[0] as any;
        console.log('📝 Resuming conversation session:', session.id);
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from('conversation_sessions')
          .insert({
            user_id: userId,
            feature: feature,
            title: `${feature} conversation - ${new Date().toLocaleDateString()}`,
            context: {},
            is_active: true,
            last_activity_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        session = newSession as any;
        console.log('🆕 Created new conversation session:', session.id);
      }

      setCurrentSession(session);
      await loadConversationHistory(session.id);
    } catch (err) {
      console.error('Error initializing conversation session:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversationHistory = async (sessionId: string) => {
    try {
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50); // Limit to last 50 messages for performance

      setConversationHistory(messages || []);
      console.log(`📚 Loaded ${messages?.length || 0} conversation messages`);
    } catch (err) {
      console.error('Error loading conversation history:', err);
    }
  };

  const addMessage = useCallback(async (
    role: 'user' | 'assistant',
    content: string,
    context?: any,
    metadata?: any
  ) => {
    if (!currentSession || !userId) return null;

    try {
      const message: Partial<ConversationMessage> = {
        session_id: currentSession.id,
        role,
        content,
        context,
        metadata,
        created_at: new Date().toISOString()
      };

      const { data: savedMessage, error } = await supabase
        .from('conversation_messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setConversationHistory(prev => [...prev, savedMessage as ConversationMessage]);

      // Update session last activity
      await supabase
        .from('conversation_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', currentSession.id);

      return savedMessage as ConversationMessage;
    } catch (err) {
      console.error('Error adding message to conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to save message');
      return null;
    }
  }, [currentSession, userId]);

  const updateSessionContext = useCallback(async (context: any) => {
    if (!currentSession) return;

    try {
      const updatedContext = { ...currentSession.context, ...context };
      
      await supabase
        .from('conversation_sessions')
        .update({ 
          context: updatedContext,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      setCurrentSession(prev => prev ? { ...prev, context: updatedContext } : null);
    } catch (err) {
      console.error('Error updating session context:', err);
    }
  }, [currentSession]);

  const getConversationSummary = useCallback(() => {
    if (conversationHistory.length === 0) return null;

    const userMessages = conversationHistory.filter(m => m.role === 'user').length;
    const assistantMessages = conversationHistory.filter(m => m.role === 'assistant').length;
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const firstMessage = conversationHistory[0];

    return {
      totalMessages: conversationHistory.length,
      userMessages,
      assistantMessages,
      firstMessageAt: firstMessage?.timestamp,
      lastMessageAt: lastMessage?.timestamp,
      duration: firstMessage && lastMessage 
        ? new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()
        : 0,
      mainTopics: extractMainTopics(conversationHistory),
      workflowsExecuted: conversationHistory
        .filter(m => m.context?.workflowExecuted)
        .map(m => m.context!.workflowExecuted)
    };
  }, [conversationHistory]);

  const searchConversations = useCallback(async (query: string, limit: number = 10) => {
    if (!userId) return [];

    try {
      // Simple text search in message content
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select(`
          *,
          conversation_sessions!inner(user_id)
        `)
        .eq('conversation_sessions.user_id', userId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      return messages || [];
    } catch (err) {
      console.error('Error searching conversations:', err);
      return [];
    }
  }, [userId]);

  const archiveSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('conversation_sessions')
        .update({ is_active: false })
        .eq('id', currentSession.id);

      setCurrentSession(null);
      setConversationHistory([]);
    } catch (err) {
      console.error('Error archiving session:', err);
    }
  }, [currentSession]);

  return {
    // State
    currentSession,
    conversationHistory,
    isLoading,
    error,

    // Actions
    addMessage,
    updateSessionContext,
    archiveSession,
    searchConversations,

    // Utilities
    getConversationSummary,
    hasHistory: conversationHistory.length > 0,
    messageCount: conversationHistory.length,

    // Context helpers
    getRecentContext: () => {
      const recentMessages = conversationHistory.slice(-5);
      return recentMessages.reduce((context, message) => {
        if (message.context) {
          Object.assign(context, message.context);
        }
        return context;
      }, {});
    },

    getUserPreferences: () => {
      // Extract user preferences from conversation history
      const preferences: Record<string, any> = {};
      
      conversationHistory.forEach(message => {
        if (message.role === 'user' && message.context) {
          if (message.context.careerPath) preferences.lastCareerPath = message.context.careerPath;
          if (message.context.location) preferences.lastLocation = message.context.location;
        }
      });

      return preferences;
    }
  };
}

function extractMainTopics(messages: ConversationMessage[]): string[] {
  const topicKeywords = [
    'market analysis', 'career path', 'skill development', 'salary insights',
    'job search', 'resume', 'portfolio', 'networking', 'interview prep',
    'career pivot', 'promotion', 'skill gap', 'learning path', 'certification'
  ];

  const topicCounts = topicKeywords.reduce((counts, topic) => {
    counts[topic] = messages.filter(m => 
      m.content.toLowerCase().includes(topic.toLowerCase())
    ).length;
    return counts;
  }, {} as Record<string, number>);

  return Object.entries(topicCounts)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
}