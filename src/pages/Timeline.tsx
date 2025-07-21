import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Trophy, Target, BookOpen, Star, TrendingUp, User } from "lucide-react";
import { format, parseISO, startOfMonth, isSameMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface TimelineEvent {
  type: 'xp' | 'level' | 'badge' | 'goal' | 'plan' | 'resume' | 'cri' | 'readiness';
  emoji: string;
  title: string;
  description?: string;
  date: string;
  data?: any;
}

const eventTypeConfig = {
  xp: { icon: Star, color: "bg-yellow-500" },
  level: { icon: TrendingUp, color: "bg-blue-500" },
  badge: { icon: Trophy, color: "bg-purple-500" },
  goal: { icon: Target, color: "bg-green-500" },
  plan: { icon: BookOpen, color: "bg-indigo-500" },
  resume: { icon: User, color: "bg-orange-500" },
  cri: { icon: TrendingUp, color: "bg-red-500" },
  readiness: { icon: TrendingUp, color: "bg-teal-500" }
};

export default function Timeline() {
  const [filterType, setFilterType] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: timelineEvents = [], isLoading } = useQuery({
    queryKey: ['timeline-events'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const events: TimelineEvent[] = [];

      // Fetch XP events and level ups
      const { data: xpEvents } = await supabase
        .from('xp_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (xpEvents) {
        for (const event of xpEvents) {
          if (event.action_type === 'level_up') {
            events.push({
              type: 'level',
              emoji: '🎉',
              title: `Level Up!`,
              description: event.reason,
              date: event.created_at,
              data: event
            });
          } else {
            events.push({
              type: 'xp',
              emoji: '⭐',
              title: `+${event.xp_amount} XP`,
              description: event.reason,
              date: event.created_at,
              data: event
            });
          }
        }
      }

      // Fetch badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges:badge_id (
            name,
            emoji,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (userBadges) {
        for (const badge of userBadges) {
          if (badge.badges) {
            events.push({
              type: 'badge',
              emoji: badge.badges.emoji,
              title: `Earned ${badge.badges.name}`,
              description: badge.badges.description,
              date: badge.earned_at,
              data: badge
            });
          }
        }
      }

      // Fetch completed goals
      const { data: goals } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', false)
        .order('updated_at', { ascending: false });

      if (goals) {
        for (const goal of goals) {
          events.push({
            type: 'goal',
            emoji: '🎯',
            title: `Completed Goal: ${goal.title}`,
            description: goal.description,
            date: goal.updated_at,
            data: goal
          });
        }
      }

      // Fetch completed milestone plans
      const { data: plans } = await supabase
        .from('milestone_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (plans) {
        for (const plan of plans) {
          events.push({
            type: 'plan',
            emoji: '📘',
            title: `Completed Plan: ${plan.title}`,
            description: plan.description,
            date: plan.completed_at || plan.updated_at,
            data: plan
          });
        }
      }

      // Fetch published resumes
      const { data: resumes } = await supabase
        .from('ai_resume_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('published_to_profile', true)
        .order('created_at', { ascending: false });

      if (resumes) {
        for (const resume of resumes) {
          events.push({
            type: 'resume',
            emoji: '📄',
            title: `Published Resume: ${resume.title}`,
            description: `CRI Score: ${resume.cri_average?.toFixed(1) || 'N/A'} | Readiness: ${resume.readiness_score?.toFixed(1) || 'N/A'}%`,
            date: resume.created_at,
            data: resume
          });
        }
      }

      // Sort all events by date (newest first)
      return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  });

  const filteredEvents = filterType 
    ? timelineEvents.filter(event => event.type === filterType)
    : timelineEvents;

  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const month = format(parseISO(event.date), 'MMMM yyyy');
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(event);
    return groups;
  }, {} as Record<string, TimelineEvent[]>);

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your Journey Begins Here</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your timeline is just beginning! Start by saving your first course, setting a goal, 
            or earning some XP to see your career progression unfold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Career Timeline</h1>
        <p className="text-muted-foreground">
          Track your journey through goals, achievements, and milestones
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Button
          variant={filterType === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType(null)}
        >
          All Events
        </Button>
        {Object.entries(eventTypeConfig).map(([type, config]) => {
          const count = timelineEvents.filter(e => e.type === type).length;
          if (count === 0) return null;
          
          return (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              <config.icon className="w-4 h-4 mr-2" />
              {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
            </Button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([month, events]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-lg font-semibold">{month}</h3>
              <Separator className="flex-1" />
              <Badge variant="outline">{events.length} events</Badge>
            </div>

            {/* Events for this month */}
            <div className="space-y-4">
              {events.map((event, index) => {
                const config = eventTypeConfig[event.type];
                const Icon = config.icon;
                
                return (
                  <Card 
                    key={`${event.date}-${index}`}
                    className="transition-all duration-300 hover:shadow-md animate-fade-in"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium mb-1 flex items-center gap-2">
                                <span className="text-lg">{event.emoji}</span>
                                {event.title}
                              </h4>
                              {event.description && (
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(parseISO(event.date), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Celebration button for testing */}
      <div className="mt-8 text-center">
        <Button 
          variant="outline" 
          onClick={triggerCelebration}
          className="text-xs"
        >
          🎉 Celebrate Your Progress
        </Button>
      </div>
    </div>
  );
}