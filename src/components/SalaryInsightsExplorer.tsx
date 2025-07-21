import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SalaryContributionModal } from './SalaryContributionModal';
import { Loader2, Search, TrendingUp, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SalaryInsight {
  id: string;
  reported_salary: number;
  experience_level: string;
  data_source: string;
  notes: string;
  created_at: string;
  career_paths: {
    id: string;
    title: string;
  };
  locations: {
    id: string;
    label: string;
    emoji: string;
  };
}

interface Location {
  id: string;
  label: string;
  emoji: string;
}

interface CareerPath {
  id: string;
  title: string;
}

const ITEMS_PER_PAGE = 25;

export const SalaryInsightsExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCareerPath, setSelectedCareerPath] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const [selectedCompanyType, setSelectedCompanyType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'salary' | 'count'>('salary');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch salary insights with joins
  const { data: salaryInsights, isLoading, refetch } = useQuery({
    queryKey: ['all-salary-insights', {
      search: searchTerm,
      careerPath: selectedCareerPath,
      location: selectedLocation,
      experience: selectedExperience,
      companyType: selectedCompanyType,
      sort: sortBy,
      page: currentPage
    }],
    queryFn: async () => {
      let query = supabase
        .from('salary_insights')
        .select(`
          id,
          reported_salary,
          experience_level,
          data_source,
          notes,
          created_at,
          career_paths!inner(id, title),
          locations!inner(id, label, emoji)
        `)
        .order(sortBy === 'salary' ? 'reported_salary' : 'created_at', { ascending: false });

      // Apply filters
      if (selectedCareerPath && selectedCareerPath !== 'all') {
        query = query.eq('career_path_id', selectedCareerPath);
      }
      if (selectedLocation && selectedLocation !== 'all') {
        query = query.eq('location_id', selectedLocation);
      }
      if (selectedExperience && selectedExperience !== 'all') {
        query = query.eq('experience_level', selectedExperience);
      }

      // Search functionality
      if (searchTerm) {
        query = query.or(`notes.ilike.%${searchTerm}%,career_paths.title.ilike.%${searchTerm}%,locations.label.ilike.%${searchTerm}%`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return { data: data as SalaryInsight[], count: count || 0 };
    }
  });

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, label, emoji')
        .eq('active', true)
        .order('label');
      if (error) throw error;
      return data as Location[];
    }
  });

  // Fetch career paths for filter
  const { data: careerPaths } = useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data as CareerPath[];
    }
  });

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const totalPages = Math.ceil((salaryInsights?.count || 0) / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCareerPath('all');
    setSelectedLocation('all');
    setSelectedExperience('all');
    setSelectedCompanyType('all');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">💰 Salary Insights</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore real salary data contributed by the community across different career paths and locations.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Transparent Salary Data</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{salaryInsights?.count || 0} Contributions</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
              <SalaryContributionModal
                selectedCareerPathId={selectedCareerPath || (careerPaths?.[0]?.id || '')}
                locations={locations || []}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Career Path</label>
              <Select value={selectedCareerPath} onValueChange={setSelectedCareerPath}>
                <SelectTrigger>
                  <SelectValue placeholder="All careers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All careers</SelectItem>
                  {careerPaths?.map(career => (
                    <SelectItem key={career.id} value={career.id}>
                      {career.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations?.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.emoji} {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Experience Level</label>
              <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="Entry">Entry Level</SelectItem>
                  <SelectItem value="Mid">Mid Level</SelectItem>
                  <SelectItem value="Senior">Senior Level</SelectItem>
                  <SelectItem value="Lead">Lead Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(value: 'salary' | 'count') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary (High to Low)</SelectItem>
                  <SelectItem value="count">Most Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search career paths, locations, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {salaryInsights?.data?.length || 0} of {salaryInsights?.count || 0} results
          </p>
        </div>

        {salaryInsights?.data && salaryInsights.data.length > 0 ? (
          <div className="grid gap-4">
            {salaryInsights.data.map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{insight.career_paths.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {insight.locations.emoji} {insight.locations.label}
                      </p>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="font-bold text-2xl text-primary">{formatSalary(insight.reported_salary)}</span>
                      <Badge variant="secondary" className="w-fit">
                        {insight.experience_level} Level
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Source</span>
                      <span className="font-medium">{insight.data_source}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div>
                      {insight.notes && (
                        <div>
                          <span className="text-sm text-muted-foreground">Notes</span>
                          <p className="text-sm">{truncateText(insight.notes)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No salary insights found. Try adjusting your filters or be the first to contribute data!</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};