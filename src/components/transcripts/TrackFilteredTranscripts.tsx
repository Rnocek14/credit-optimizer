import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Star, GraduationCap, Building, Users, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import type { EnhancedTranscript } from '@/types/institutions';

interface TrackFilteredTranscriptsProps {
  selectedTrackId?: string;
}

export function TrackFilteredTranscripts({ selectedTrackId }: TrackFilteredTranscriptsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

  const { data: transcripts = [], isLoading } = useQuery({
    queryKey: ['enhanced-transcripts', selectedTrackId],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('transcripts')
        .select(`
          *,
          institution:institutions(*),
          teacher:teachers(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by track if specified
      if (selectedTrackId) {
        query = query.contains('track_ids', [selectedTrackId]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as EnhancedTranscript[];
    },
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, type')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Apply filters
  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesSearch = !searchTerm || 
      transcript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.institution?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.teacher?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesInstitution = institutionFilter === 'all' || 
      transcript.institution_id === institutionFilter;

    const matchesVerification = verificationFilter === 'all' || 
      transcript.verification_status === verificationFilter;

    return matchesSearch && matchesInstitution && matchesVerification;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'institution_verified':
        return <Badge className="bg-green-100 text-green-700">Institution Verified</Badge>;
      case 'mentor_verified':
        return <Badge className="bg-blue-100 text-blue-700">Mentor Verified</Badge>;
      case 'self_reported':
      default:
        return <Badge variant="outline">Self Reported</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
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
            <Filter className="h-5 w-5" />
            Filter Transcripts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcripts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All institutions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutions</SelectItem>
                {institutions.map(institution => (
                  <SelectItem key={institution.id} value={institution.id}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All verification types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="institution_verified">Institution Verified</SelectItem>
                <SelectItem value="mentor_verified">Mentor Verified</SelectItem>
                <SelectItem value="self_reported">Self Reported</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredTranscripts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No transcripts found</h3>
            <p className="text-muted-foreground">
              {searchTerm || institutionFilter !== 'all' || verificationFilter !== 'all'
                ? 'Try adjusting your filters'
                : selectedTrackId 
                ? 'No transcripts for this track yet' 
                : 'Add your first transcript to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTranscripts.map((transcript) => (
            <Card key={transcript.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{transcript.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {getVerificationBadge(transcript.verification_status)}
                        {transcript.grade && (
                          <Badge variant="secondary">Grade: {transcript.grade}</Badge>
                        )}
                        {transcript.cri_score && (
                          <Badge className="bg-blue-100 text-blue-700">
                            CRI: {transcript.cri_score}
                          </Badge>
                        )}
                        {transcript.difficulty && (
                          <Badge variant="outline">{transcript.difficulty}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Institution & Teacher Info */}
                    <div className="flex items-center gap-6 text-sm">
                      {transcript.institution && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{transcript.institution.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {transcript.institution.type}
                          </Badge>
                        </div>
                      )}
                      
                      {transcript.teacher && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{transcript.teacher.name}</span>
                          {transcript.teacher.average_rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current text-yellow-500" />
                              <span>{transcript.teacher.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Track Tags */}
                    {transcript.track_ids.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Used in tracks:</span>
                        <div className="flex flex-wrap gap-1">
                          {/* For now showing track IDs, would need to fetch track names */}
                          {transcript.track_ids.map((trackId, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              Track {index + 1}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {transcript.skill_tags && transcript.skill_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {transcript.skill_tags.slice(0, 6).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {transcript.skill_tags.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{transcript.skill_tags.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-sm text-muted-foreground">
                    <div>{formatDate(transcript.created_at)}</div>
                    {transcript.credits_earned && (
                      <div className="mt-1">
                        {transcript.credits_earned} credits
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}