import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InstitutionChip } from '@/components/providers/InstitutionChip';
import { TeacherChip } from '@/components/providers/TeacherChip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { 
  Search, 
  Filter, 
  GraduationCap,
  Star,
  Shield,
  ShieldCheck,
  User,
  Calendar,
  Trophy
} from 'lucide-react';
import type { EnhancedTranscript } from '@/types/institutions';

interface TranscriptsUnifiedProps {
  selectedTrackId?: string;
}

const getVerificationIcon = (status?: string) => {
  switch (status) {
    case 'institution_verified': return ShieldCheck;
    case 'mentor_verified': return Shield;
    case 'self_reported': return User;
    default: return User;
  }
};

const getVerificationColor = (status?: string) => {
  switch (status) {
    case 'institution_verified': return 'text-green-600';
    case 'mentor_verified': return 'text-blue-600';
    case 'self_reported': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long'
  }).format(date);
};

const groupByMonth = (transcripts: EnhancedTranscript[]) => {
  const grouped = transcripts.reduce((acc, transcript) => {
    const monthKey = formatDate(transcript.created_at);
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(transcript);
    return acc;
  }, {} as Record<string, EnhancedTranscript[]>);

  return Object.entries(grouped).sort(([a], [b]) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
};

export function TranscriptsUnified({ selectedTrackId }: TranscriptsUnifiedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
  });

  const { data: transcripts = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.ENHANCED_TRANSCRIPTS(currentUser?.id, selectedTrackId),
    queryFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');

      let query = supabase
        .from('transcripts')
        .select(`
          *,
          institution:institutions(*),
          teacher:teachers(*)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (selectedTrackId) {
        query = query.contains('track_ids', [selectedTrackId]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as EnhancedTranscript[];
    },
    enabled: !!currentUser,
  });

  const { data: institutions = [] } = useQuery({
    queryKey: QUERY_KEYS.INSTITUTIONS(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: teachers = [] } = useQuery({
    queryKey: QUERY_KEYS.TEACHERS_TOP(50),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const filteredTranscripts = useMemo(() => {
    return transcripts.filter(transcript => {
      // Search filter
      if (searchTerm && !transcript.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !transcript.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Institution filter
      if (institutionFilter !== 'all' && transcript.institution_id !== institutionFilter) {
        return false;
      }

      // Teacher filter
      if (teacherFilter !== 'all' && transcript.teacher_id !== teacherFilter) {
        return false;
      }

      // Verification filter
      if (verificationFilter !== 'all' && transcript.verification_status !== verificationFilter) {
        return false;
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && transcript.difficulty !== difficultyFilter) {
        return false;
      }

      return true;
    });
  }, [transcripts, searchTerm, institutionFilter, teacherFilter, verificationFilter, difficultyFilter]);

  const groupedTranscripts = useMemo(() => 
    groupByMonth(filteredTranscripts), 
    [filteredTranscripts]
  );

  const activeFiltersCount = [
    searchTerm,
    institutionFilter !== 'all' ? institutionFilter : null,
    teacherFilter !== 'all' ? teacherFilter : null,
    verificationFilter !== 'all' ? verificationFilter : null,
    difficultyFilter !== 'all' ? difficultyFilter : null,
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Institution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutions</SelectItem>
                {institutions.map(inst => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="institution_verified">Institution Verified</SelectItem>
                <SelectItem value="mentor_verified">Mentor Verified</SelectItem>
                <SelectItem value="self_reported">Self Reported</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setInstitutionFilter('all');
                setTeacherFilter('all');
                setVerificationFilter('all');
                setDifficultyFilter('all');
              }}
            >
              Clear all filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {groupedTranscripts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No transcripts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFiltersCount > 0 
                ? 'Try adjusting your filters to see more results.'
                : 'You haven\'t added any learning transcripts yet. Start by completing courses and adding them to your profile.'
              }
            </p>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setInstitutionFilter('all');
                  setTeacherFilter('all');
                  setVerificationFilter('all');
                  setDifficultyFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedTranscripts.map(([month, monthTranscripts]) => (
            <div key={month} className="space-y-4">
              {/* Month Header */}
              <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold">{month}</h3>
                  <Badge variant="outline" className="text-xs">
                    {monthTranscripts.length} items
                  </Badge>
                </div>
              </div>

              {/* Transcripts for this month */}
              <div className="grid gap-4">
                {monthTranscripts.map((transcript) => {
                  const VerificationIcon = getVerificationIcon(transcript.verification_status);
                  const verificationColor = getVerificationColor(transcript.verification_status);

                  return (
                    <Card key={transcript.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{transcript.title}</h4>
                                <VerificationIcon className={`w-4 h-4 ${verificationColor}`} />
                              </div>
                              {transcript.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {transcript.description}
                                </p>
                              )}
                            </div>
                            {transcript.grade && (
                              <Badge variant="secondary" className="ml-2">
                                {transcript.grade}
                              </Badge>
                            )}
                          </div>

                          {/* Provider Information */}
                          <div className="space-y-2">
                            {transcript.institution_id && (
                              <InstitutionChip 
                                institutionId={transcript.institution_id}
                                variant="compact"
                              />
                            )}
                            {transcript.teacher_id && (
                              <TeacherChip 
                                teacherId={transcript.teacher_id}
                                variant="compact"
                              />
                            )}
                          </div>

                          {/* Metrics */}
                          <div className="flex items-center gap-4 text-sm">
                            {transcript.cri_score && (
                              <div className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-yellow-500" />
                                <span>CRI {transcript.cri_score}</span>
                              </div>
                            )}
                            {transcript.credits_earned && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-blue-500" />
                                <span>{transcript.credits_earned} credits</span>
                              </div>
                            )}
                            {transcript.difficulty && (
                              <Badge 
                                variant={transcript.difficulty === 'beginner' ? 'secondary' : 
                                        transcript.difficulty === 'intermediate' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {transcript.difficulty}
                              </Badge>
                            )}
                          </div>

                          {/* Skill Tags */}
                          {transcript.skill_tags && transcript.skill_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {transcript.skill_tags.slice(0, 5).map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {transcript.skill_tags.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{transcript.skill_tags.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}