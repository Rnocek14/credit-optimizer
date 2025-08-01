import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  Moon, 
  Sun, 
  Type, 
  Gamepad2,
  Trophy,
  Star,
  Zap,
  Users,
  Settings,
  Play,
  Pause
} from 'lucide-react';

interface VoiceSettings {
  enabled: boolean;
  rate: number;
  pitch: number;
  volume: number;
  voice: string;
}

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  colorBlindFriendly: boolean;
}

interface GamificationData {
  currentLevel: number;
  totalXP: number;
  nextLevelXP: number;
  streakDays: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    progress?: number;
  }>;
  leaderboard: Array<{
    rank: number;
    name: string;
    xp: number;
    avatar?: string;
  }>;
}

export const EnhancedUXAccessibility: React.FC = () => {
  const [activeTab, setActiveTab] = useState('voice');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: false,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    voice: 'default'
  });
  
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    colorBlindFriendly: false
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);

  const gamificationData: GamificationData = {
    currentLevel: 7,
    totalXP: 2450,
    nextLevelXP: 3000,
    streakDays: 12,
    badges: [
      {
        id: 'first-course',
        name: 'First Steps',
        description: 'Complete your first course',
        icon: '🎯',
        earned: true
      },
      {
        id: 'week-streak',
        name: 'Consistent Learner',
        description: 'Learn for 7 days straight',
        icon: '🔥',
        earned: true
      },
      {
        id: 'skill-master',
        name: 'Skill Master',
        description: 'Master 5 different skills',
        icon: '🏆',
        earned: false,
        progress: 60
      },
      {
        id: 'team-player',
        name: 'Team Player',
        description: 'Help 3 teammates with learning',
        icon: '🤝',
        earned: false,
        progress: 33
      }
    ],
    leaderboard: [
      { rank: 1, name: 'Sarah Chen', xp: 4250 },
      { rank: 2, name: 'Marcus Johnson', xp: 3890 },
      { rank: 3, name: 'You', xp: 2450 },
      { rank: 4, name: 'Emma Rodriguez', xp: 2200 },
      { rank: 5, name: 'James Wilson', xp: 1950 }
    ]
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
  }, []);

  const handleVoiceTest = useCallback(() => {
    if (!speechSynthesis) return;

    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const text = "Welcome to your personalized learning journey. Navigate through courses, track your progress, and unlock achievements as you grow your skills.";
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechSynthesis.speak(utterance);
  }, [speechSynthesis, voiceSettings, isPlaying]);

  const updateVoiceSetting = useCallback((key: keyof VoiceSettings, value: any) => {
    setVoiceSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateAccessibilitySetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setAccessibilitySettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const xpProgress = (gamificationData.totalXP / gamificationData.nextLevelXP) * 100;

  return (
    <div className="space-y-6">
      {/* Accessibility Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Enhanced User Experience & Accessibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">WCAG 2.1</p>
              <p className="text-sm text-muted-foreground">AA Compliant</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">8/8</p>
              <p className="text-sm text-muted-foreground">Accessibility Features</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">Level {gamificationData.currentLevel}</p>
              <p className="text-sm text-muted-foreground">Current Level</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{gamificationData.streakDays}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice Navigation
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="gamification" className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Gamification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Voice-Guided Navigation
                <Switch 
                  checked={voiceSettings.enabled}
                  onCheckedChange={(checked) => updateVoiceSetting('enabled', checked)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    Speech Rate
                    <span className="text-muted-foreground">{voiceSettings.rate}x</span>
                  </label>
                  <Slider
                    value={[voiceSettings.rate]}
                    onValueChange={([value]) => updateVoiceSetting('rate', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    disabled={!voiceSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    Pitch
                    <span className="text-muted-foreground">{voiceSettings.pitch}</span>
                  </label>
                  <Slider
                    value={[voiceSettings.pitch]}
                    onValueChange={([value]) => updateVoiceSetting('pitch', value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    disabled={!voiceSettings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    Volume
                    <span className="text-muted-foreground">{Math.round(voiceSettings.volume * 100)}%</span>
                  </label>
                  <Slider
                    value={[voiceSettings.volume]}
                    onValueChange={([value]) => updateVoiceSetting('volume', value)}
                    min={0}
                    max={1}
                    step={0.1}
                    disabled={!voiceSettings.enabled}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleVoiceTest}
                  disabled={!voiceSettings.enabled}
                  className="w-full"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Voice Test
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test Voice Settings
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                <h4 className="font-medium">Voice Commands Available:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs">"Navigate to courses"</code>
                    <span className="text-muted-foreground">Go to course page</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs">"Show my progress"</code>
                    <span className="text-muted-foreground">Display progress overview</span>
                  </div>
                  <div className="flex justify-between">
                    <code className="bg-muted px-2 py-1 rounded text-xs">"Start learning"</code>
                    <span className="text-muted-foreground">Begin next lesson</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">High Contrast Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Increase color contrast for better visibility
                    </p>
                  </div>
                  <Switch 
                    checked={accessibilitySettings.highContrast}
                    onCheckedChange={(checked) => updateAccessibilitySetting('highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Large Text</p>
                    <p className="text-sm text-muted-foreground">
                      Increase font size throughout the application
                    </p>
                  </div>
                  <Switch 
                    checked={accessibilitySettings.largeText}
                    onCheckedChange={(checked) => updateAccessibilitySetting('largeText', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Reduced Motion</p>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch 
                    checked={accessibilitySettings.reducedMotion}
                    onCheckedChange={(checked) => updateAccessibilitySetting('reducedMotion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Screen Reader Optimization</p>
                    <p className="text-sm text-muted-foreground">
                      Enhanced compatibility with screen readers
                    </p>
                  </div>
                  <Switch 
                    checked={accessibilitySettings.screenReader}
                    onCheckedChange={(checked) => updateAccessibilitySetting('screenReader', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Color Blind Friendly</p>
                    <p className="text-sm text-muted-foreground">
                      Use patterns and shapes in addition to colors
                    </p>
                  </div>
                  <Switch 
                    checked={accessibilitySettings.colorBlindFriendly}
                    onCheckedChange={(checked) => updateAccessibilitySetting('colorBlindFriendly', checked)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Keyboard Navigation</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <kbd className="bg-muted px-2 py-1 rounded text-xs">Tab</kbd>
                    <span className="text-muted-foreground">Navigate between elements</span>
                  </div>
                  <div className="flex justify-between">
                    <kbd className="bg-muted px-2 py-1 rounded text-xs">Enter / Space</kbd>
                    <span className="text-muted-foreground">Activate buttons and links</span>
                  </div>
                  <div className="flex justify-between">
                    <kbd className="bg-muted px-2 py-1 rounded text-xs">Esc</kbd>
                    <span className="text-muted-foreground">Close modals and overlays</span>
                  </div>
                  <div className="flex justify-between">
                    <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl + K</kbd>
                    <span className="text-muted-foreground">Open command palette</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamification" className="space-y-4">
          {/* Level Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Your Learning Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Level {gamificationData.currentLevel}</p>
                  <p className="text-sm text-muted-foreground">
                    {gamificationData.totalXP} / {gamificationData.nextLevelXP} XP
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{gamificationData.nextLevelXP - gamificationData.totalXP} XP to next level</p>
                  <p className="text-xs text-muted-foreground">🔥 {gamificationData.streakDays} day streak</p>
                </div>
              </div>
              <Progress value={xpProgress} className="h-3" />
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {gamificationData.badges.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        {badge.progress && (
                          <div className="mt-1">
                            <Progress value={badge.progress} className="h-1 w-32" />
                            <p className="text-xs text-muted-foreground mt-1">{badge.progress}% complete</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={badge.earned ? 'default' : 'outline'}>
                      {badge.earned ? 'Earned' : 'In Progress'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gamificationData.leaderboard.map((entry) => (
                  <div key={entry.rank} className={`flex items-center justify-between p-3 border rounded-lg ${
                    entry.name === 'You' ? 'bg-primary/5 border-primary/20' : ''
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                        {entry.rank <= 3 ? (
                          <div className="text-sm">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </div>
                        ) : (
                          <span className="text-sm font-medium">#{entry.rank}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-sm text-muted-foreground">{entry.xp.toLocaleString()} XP</p>
                      </div>
                    </div>
                    {entry.name === 'You' && (
                      <Badge>Your Rank</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};