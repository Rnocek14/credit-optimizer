import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';

export function AdminSetup() {
  const [isChecking, setIsChecking] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { isAdmin, role } = useUserRole();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const checkTableExists = async () => {
    setIsChecking(true);
    try {
      // Try to query the user_roles table
      const { error } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') || error.code === '42P01') {
          setTableExists(false);
          toast.error('Roles table not found', {
            description: 'Please run the SQL migration first'
          });
        } else {
          throw error;
        }
      } else {
        setTableExists(true);
        toast.success('Roles table exists');
      }
    } catch (error) {
      console.error('Error checking table:', error);
      toast.error('Check failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const makeMeAdmin = async () => {
    setIsSettingUp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated', {
          description: 'Please log in first to set up admin access'
        });
        setIsAuthenticated(false);
        setIsSettingUp(false);
        return;
      }

      // Try to insert admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (error) {
        // Check if already exists
        if (error.code === '23505') {
          toast.info('Already an admin', {
            description: 'Your admin role is already set up'
          });
        } else {
          throw error;
        }
      } else {
        toast.success('Admin role assigned!', {
          description: 'You can now access admin features'
        });
      }

      // Refresh the page to update role
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error setting up admin:', error);
      toast.error('Setup failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const SQL_MIGRATION = `-- Run this in your Supabase SQL Editor first:

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);`;

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    toast.success('SQL copied to clipboard');
  };

  // Not authenticated check
  if (isAuthenticated === false) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            You need to be logged in to set up admin access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/auth">
              <LogIn className="h-4 w-4 mr-2" />
              Log In
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isAdmin) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Admin Access Enabled
          </CardTitle>
          <CardDescription>
            You have admin privileges and can access admin features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/admin/transfer-rules">
              <Shield className="h-4 w-4 mr-2" />
              Go to Admin Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Setup
        </CardTitle>
        <CardDescription>
          Set up admin access to manage transfer rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {role && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Current role: <span className="font-medium">{role}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={checkTableExists}
              disabled={isChecking}
              variant="outline"
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Setup Status'
              )}
            </Button>
          </div>

          {tableExists === false && (
            <div className="border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">Step 1: Run SQL Migration</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Copy and run this SQL in your Supabase Dashboard → SQL Editor
                  </p>
                  <div className="relative">
                    <pre className="bg-black/5 dark:bg-white/5 p-3 rounded text-xs overflow-x-auto max-h-40">
                      {SQL_MIGRATION}
                    </pre>
                    <Button
                      onClick={copySQL}
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                    >
                      Copy SQL
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tableExists === true && (
            <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">Step 2: Assign Admin Role</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Click the button below to give yourself admin access
                  </p>
                  <Button
                    onClick={makeMeAdmin}
                    disabled={isSettingUp}
                    className="w-full"
                  >
                    {isSettingUp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting Up...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Me Admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
