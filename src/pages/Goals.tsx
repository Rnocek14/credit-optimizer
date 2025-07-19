import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  target_role: string;
  target_date: string;
  active: boolean;
  created_at: string;
}

const Goals = () => {
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchGoals(user.id);
    } else {
      // Use demo data for Aisha Khan if no user is logged in
      fetchGoals('2b458624-d498-4cca-a63d-9341cc20e363');
    }
  };

  const fetchGoals = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        toast.error('Failed to load goals');
        return;
      }

      setGoals(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatCreatedDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading goals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            🎯 <span>Career Goals</span>
          </h1>
          <p className="text-muted-foreground">
            Track your career aspirations and professional development targets
          </p>
        </div>

        {/* Goals Grid */}
        {goals.length === 0 ? (
          // Empty State
          <Card className="max-w-md mx-auto shadow-lg rounded-xl">
            <CardContent className="text-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Goals Set Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start planning your career journey by setting clear, actionable goals that align with your professional aspirations.
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add a New Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <Card 
                key={goal.id} 
                className="rounded-xl border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg leading-tight">
                      {goal.title}
                    </CardTitle>
                    <Badge 
                      variant={goal.active ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {goal.active ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Circle className="h-3 w-3 mr-1" />
                      )}
                      {goal.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {goal.description}
                  </p>

                  {/* Target Role */}
                  {goal.target_role && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Target Role:</div>
                      <Badge variant="outline" className="font-medium">
                        <Target className="h-3 w-3 mr-1" />
                        {goal.target_role}
                      </Badge>
                    </div>
                  )}

                  {/* Target Date */}
                  {goal.target_date && (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Goal Date:</span>
                      <span className="text-muted-foreground">
                        {formatDate(goal.target_date)}
                      </span>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                    <span className="font-medium">Created:</span>
                    <span>{formatCreatedDate(goal.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        <Button
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Goals;