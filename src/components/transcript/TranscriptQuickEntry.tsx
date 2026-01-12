import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  GraduationCap,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// Known providers from credit_transfer_rules
const PROVIDERS = [
  { id: 'SOPHIA', name: 'Sophia Learning' },
  { id: 'STUDYCOM', name: 'Study.com' },
  { id: 'STRAIGHTERLINE', name: 'StraighterLine' },
  { id: 'CLEP', name: 'CLEP Exams' },
  { id: 'DSST', name: 'DSST Exams' },
  { id: 'ACE', name: 'ACE Credit' },
  { id: 'AP', name: 'AP Exams' },
  { id: 'TECEP', name: 'TECEP (TESU)' },
] as const;

const GRADES = ['A', 'B', 'C', 'Pass', 'Fail'] as const;

interface CourseOption {
  id: string;
  code: string;
  title: string;
  credits: number;
  provider_id: string;
}

interface TranscriptQuickEntryProps {
  targetSchool?: string;
  onEntryAdded?: () => void;
}

export function TranscriptQuickEntry({ 
  targetSchool = 'TESU',
  onEntryAdded 
}: TranscriptQuickEntryProps) {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);

  // Fetch courses from marketplace
  const { data: allCourses = [] } = useQuery({
    queryKey: ['marketplace-courses-for-entry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_courses')
        .select('id, code, title, credits, provider_id')
        .eq('active', true)
        .order('title');
      
      if (error) throw error;
      return (data || []) as CourseOption[];
    }
  });

  // Filter courses by selected provider
  const filteredCourses = useMemo(() => {
    if (!selectedProvider) return allCourses;
    // Match provider by code prefix pattern
    return allCourses.filter(c => {
      const codeUpper = c.code.toUpperCase();
      if (selectedProvider === 'SOPHIA') return codeUpper.startsWith('SOPH');
      if (selectedProvider === 'STUDYCOM') return codeUpper.startsWith('STUD') || codeUpper.startsWith('STDY') || codeUpper.startsWith('SDC');
      if (selectedProvider === 'STRAIGHTERLINE') return codeUpper.startsWith('SL-') || codeUpper.startsWith('STRAIGHT');
      if (selectedProvider === 'CLEP') return codeUpper.startsWith('CLEP');
      if (selectedProvider === 'DSST') return codeUpper.startsWith('DSST');
      if (selectedProvider === 'ACE') return codeUpper.startsWith('ACE');
      if (selectedProvider === 'AP') return codeUpper.startsWith('AP-');
      if (selectedProvider === 'TECEP') return codeUpper.startsWith('TECEP');
      return true;
    });
  }, [allCourses, selectedProvider]);

  // Check transfer status for selected course
  const { data: transferStatus, isLoading: checkingTransfer } = useQuery({
    queryKey: ['transfer-check', selectedCourse?.code, selectedProvider, targetSchool],
    queryFn: async () => {
      if (!selectedCourse || !selectedProvider) return null;

      const { data, error } = await supabase
        .from('credit_transfer_rules')
        .select('*')
        .eq('target_institution', targetSchool)
        .eq('source_institution', selectedProvider)
        .ilike('source_course_code', `%${selectedCourse.code.split('-').pop()}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Transfer check error:', error);
        return null;
      }

      return data;
    },
    enabled: !!selectedCourse && !!selectedProvider
  });

  // Grade validation
  const gradeWarning = useMemo(() => {
    if (!grade) return null;
    if (grade === 'Fail') return 'This grade will not transfer';
    if (grade === 'C') return 'C grades may not transfer to some programs';
    return null;
  }, [grade]);

  // Add course mutation
  const addCourseMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!selectedCourse || !grade) throw new Error('Missing required fields');

      // Add to transcripts table
      const { error } = await supabase.from('transcripts').insert({
        user_id: user.id,
        title: `${selectedCourse.code}: ${selectedCourse.title}`,
        description: `Completed via ${PROVIDERS.find(p => p.id === selectedProvider)?.name || selectedProvider}`,
        grade,
        credits: selectedCourse.credits,
        difficulty: 'Intermediate',
        skill_tags: [],
        cri_score: grade === 'A' ? 85 : grade === 'B' ? 75 : 65,
        verified: false,
        use_in_resume: true
      });

      if (error) throw error;
      return selectedCourse.code;
    },
    onSuccess: (code) => {
      toast.success('Course added to transcript');
      setRecentlyAdded(prev => [code, ...prev].slice(0, 5));
      setSelectedCourse(null);
      setGrade('');
      queryClient.invalidateQueries({ queryKey: ['transcript-entries'] });
      onEntryAdded?.();
    },
    onError: (error) => {
      toast.error('Failed to add course', { description: error.message });
    }
  });

  const handleAddCourse = () => {
    if (!selectedCourse || !grade) {
      toast.error('Please select a course and grade');
      return;
    }
    addCourseMutation.mutate();
  };

  const getTransferBadge = () => {
    if (!selectedCourse) return null;
    if (checkingTransfer) {
      return <Badge variant="outline" className="animate-pulse">Checking...</Badge>;
    }
    if (transferStatus?.acceptance_status === 'accepted') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified Transfer to {targetSchool}
        </Badge>
      );
    }
    if (transferStatus?.acceptance_status === 'elective') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Check className="h-3 w-3 mr-1" />
          Transfers as Elective
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <HelpCircle className="h-3 w-3 mr-1" />
        Transfer status unknown
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Quick Add Course
        </CardTitle>
        <CardDescription>
          Add completed courses from alternative credit providers. We'll check if they transfer to {targetSchool}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Select */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={selectedProvider} onValueChange={(v) => {
            setSelectedProvider(v);
            setSelectedCourse(null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select where you took the course" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Course Select with Autocomplete */}
        <div className="space-y-2">
          <Label>Course</Label>
          <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={courseSearchOpen}
                className="w-full justify-between font-normal"
                disabled={!selectedProvider}
              >
                {selectedCourse 
                  ? `${selectedCourse.code}: ${selectedCourse.title}`
                  : selectedProvider 
                    ? "Search for a course..."
                    : "Select a provider first"
                }
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search courses..." />
                <CommandList>
                  <CommandEmpty>No courses found.</CommandEmpty>
                  <CommandGroup>
                    {filteredCourses.slice(0, 20).map((course) => (
                      <CommandItem
                        key={course.id}
                        value={`${course.code} ${course.title}`}
                        onSelect={() => {
                          setSelectedCourse(course);
                          setCourseSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCourse?.id === course.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{course.code}</span>
                          <span className="text-sm text-muted-foreground">{course.title}</span>
                        </div>
                        <Badge variant="secondary" className="ml-auto">{course.credits} cr</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Transfer Status Badge */}
        {selectedCourse && (
          <div className="flex items-center gap-2">
            {getTransferBadge()}
          </div>
        )}

        {/* Grade Select */}
        <div className="space-y-2">
          <Label>Grade Earned</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gradeWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              {gradeWarning}
            </div>
          )}
        </div>

        {/* Add Button */}
        <Button 
          onClick={handleAddCourse}
          disabled={!selectedCourse || !grade || addCourseMutation.isPending}
          className="w-full"
        >
          {addCourseMutation.isPending ? (
            "Adding..."
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add to Transcript
            </>
          )}
        </Button>

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-muted-foreground text-xs">Recently Added</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {recentlyAdded.map((code, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1 text-green-600" />
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
