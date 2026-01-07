import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Users, Mail, CreditCard, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FunnelData {
  signups: number;
  emailConnected: number;
  checkouts: number;
  proConversions: number;
  signupToEmail: number;
  checkoutToPro: number;
}

interface DailyData {
  date: string;
  signups: number;
  emailConnected: number;
  checkouts: number;
  proConversions: number;
}

export default function AdminAnalytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelData>({
    signups: 0,
    emailConnected: 0,
    checkouts: 0,
    proConversions: 0,
    signupToEmail: 0,
    checkoutToPro: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const since = new Date();
      if (range === '7d') since.setDate(since.getDate() - 7);
      if (range === '30d') since.setDate(since.getDate() - 30);
      if (range === '90d') since.setDate(since.getDate() - 90);

      // Query analytics_events table (bypassing types as table may not be in schema yet)
      const { data: allEvents, error } = await (supabase as any)
        .from('analytics_events')
        .select('event, user_id, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate funnel metrics
      const signupUsers = new Set(allEvents?.filter((e: any) => e.event === 'user_signup').map((e: any) => e.user_id) || []);
      const emailUsers = new Set(allEvents?.filter((e: any) => e.event === 'email_connected').map((e: any) => e.user_id) || []);
      const checkoutUsers = new Set(allEvents?.filter((e: any) => e.event === 'checkout_started').map((e: any) => e.user_id) || []);
      const proUsers = new Set(allEvents?.filter((e: any) => e.event === 'pro_subscription').map((e: any) => e.user_id) || []);

      const emailConnectedAfterSignup = Array.from(emailUsers).filter(u => signupUsers.has(u)).length;
      const proAfterCheckout = Array.from(proUsers).filter(u => checkoutUsers.has(u)).length;

      setFunnel({
        signups: signupUsers.size,
        emailConnected: emailUsers.size,
        checkouts: checkoutUsers.size,
        proConversions: proUsers.size,
        signupToEmail: signupUsers.size > 0 ? (emailConnectedAfterSignup / signupUsers.size) * 100 : 0,
        checkoutToPro: checkoutUsers.size > 0 ? (proAfterCheckout / checkoutUsers.size) * 100 : 0,
      });

      // Calculate daily breakdown
      const dailyMap = new Map<string, DailyData>();
      allEvents?.forEach((event: any) => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, signups: 0, emailConnected: 0, checkouts: 0, proConversions: 0 });
        }
        const day = dailyMap.get(date)!;
        if (event.event === 'user_signup') day.signups++;
        if (event.event === 'email_connected') day.emailConnected++;
        if (event.event === 'checkout_started') day.checkouts++;
        if (event.event === 'pro_subscription') day.proConversions++;
      });

      setDailyData(Array.from(dailyMap.values()));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track conversion funnels and user engagement</p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
        ) : (
          <>
            {/* Funnel Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Signups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{funnel.signups}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total new users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Connected</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{funnel.emailConnected}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{funnel.signupToEmail.toFixed(1)}%</span>
                    <span className="ml-1">conversion rate</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Checkouts</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{funnel.checkouts}</div>
                  <p className="text-xs text-muted-foreground mt-1">Checkout initiated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pro Conversions</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{funnel.proConversions}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{funnel.checkoutToPro.toFixed(1)}%</span>
                    <span className="ml-1">conversion rate</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="signups" fill="var(--primary)" name="Signups" />
                    <Bar dataKey="emailConnected" fill="var(--secondary)" name="Email Connected" />
                    <Bar dataKey="checkouts" fill="var(--accent)" name="Checkouts" />
                    <Bar dataKey="proConversions" fill="var(--success)" name="Pro Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5" />
                      <span className="font-medium">Signup</span>
                    </div>
                    <span className="text-2xl font-bold">{funnel.signups}</span>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className={`flex items-center gap-1 ${funnel.signupToEmail >= 50 ? 'text-success' : 'text-destructive'}`}>
                        {funnel.signupToEmail >= 50 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="font-bold">{funnel.signupToEmail.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <span className="font-medium">Email Connected</span>
                    </div>
                    <span className="text-2xl font-bold">{funnel.emailConnected}</span>
                  </div>

                  <div className="h-8" />

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">Checkout Started</span>
                    </div>
                    <span className="text-2xl font-bold">{funnel.checkouts}</span>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className={`flex items-center gap-1 ${funnel.checkoutToPro >= 50 ? 'text-success' : 'text-destructive'}`}>
                        {funnel.checkoutToPro >= 50 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span className="font-bold">{funnel.checkoutToPro.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Pro Subscription</span>
                    </div>
                    <span className="text-2xl font-bold">{funnel.proConversions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
