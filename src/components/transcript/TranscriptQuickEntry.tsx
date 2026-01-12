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
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  GraduationCap,
  ChevronsUpDown,
  ShieldCheck,
  ShieldAlert,
  FileQuestion
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useSingleTransferVerification,
  normalizeProviderCode,
  normalizeCourseCode
} from "@/pages/EduTree/marketplace/hooks/useTransferVerification";
import { RISK_CLASS_CONFIG, classifyTransferRisk } from "@/types/transferRisk";

// Known providers - must match credit_transfer_rules.source_institution
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
  const [recentlyAdded, setRecentlyAdded] = useState<Array<{code: string; status: string}>>([]);

  // Fetch courses from marketplace - filter by provider using provider_id join
  const { data: allCourses = [] } = useQuery({
    queryKey: ['marketplace-courses-for-entry', selectedProvider],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_courses')
        .select('id, code, title, credits, provider_id, providers!inner(provider_code)')
        .eq('active', true)
        .order('title');
      
      // Filter by provider if selected
      if (selectedProvider) {
        query = query.eq('providers.provider_code', selectedProvider);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching courses:', error);
        // Fallback: fetch without join if providers table doesn't exist
        const { data: fallbackData } = await supabase
          .from('marketplace_courses')
          .select('id, code, title, credits, provider_id')
          .eq('active', true)
          .order('title');
        return (fallbackData || []) as CourseOption[];
      }
      return (data || []) as CourseOption[];
    }
  });

  // Use the REAL transfer verification hook - exact same logic as marketplace
  const { 
    data: transferResult, 
    isLoading: checkingTransfer 
  } = useSingleTransferVerification(
    selectedCourse?.code,
    selectedProvider,
    targetSchool
  );

  // Grade validation
  const gradeWarning = useMemo(() => {
    if (!grade) return null;
    if (grade === 'Fail') return { text: 'This grade will not transfer', severity: 'error' };
    if (grade === 'C') return { text: 'C grades may not transfer to some programs. Verify program requirements.', severity: 'warning' };
    return null;
  }, [grade]);

  // Classify risk based on transfer result
  const riskClass = useMemo(() => {
    if (!transferResult) return null;
    // Rule exists if status is verified/elective/review (not unknown)
    const hasRule = transferResult.status !== 'unknown';
    return classifyTransferRisk(
      hasRule,
      transferResult.confidence,
      transferResult.evidenceUrl,
      transferResult.ruleSource,
      transferResult.status === 'verified' ? 'accepted' : 
        transferResult.status === 'elective' ? 'elective' : undefined
    );
  }, [transferResult]);

  // Add course mutation - insert into user_completed_courses (not transcripts!)
  const addCourseMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!selectedCourse || !grade || !selectedProvider) throw new Error('Missing required fields');

      const normalizedProvider = normalizeProviderCode(selectedProvider);
      const normalizedCourse = normalizeCourseCode(selectedCourse.code);

      // Insert into user_completed_courses (canonical completion table)
      const { error } = await supabase.from('user_completed_courses').insert({
        user_id: user.id,
        provider_code: normalizedProvider,
        course_code: normalizedCourse,
        course_title: selectedCourse.title,
        credits: selectedCourse.credits,
        grade,
        source: 'manual',
        marketplace_course_id: selectedCourse.id
      });

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('This course has already been added');
        }
        throw error;
      }
      
      return { 
        code: selectedCourse.code, 
        status: transferResult?.status || 'unknown' 
      };
    },
    onSuccess: (result) => {
      toast.success('Course added successfully');
      setRecentlyAdded(prev => [result, ...prev].slice(0, 5));
      setSelectedCourse(null);
      setGrade('');
      queryClient.invalidateQueries({ queryKey: ['user-completed-courses'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-verification'] });
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

  // Render transfer status with risk class
  const getTransferBadge = () => {
    if (!selectedCourse) return null;
    
    if (checkingTransfer) {
      return <Badge variant="outline" className="animate-pulse">Checking transfer...</Badge>;
    }
    
    if (!transferResult) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <HelpCircle className="h-3 w-3 mr-1" />
          Unable to check transfer
        </Badge>
      );
    }

    // Use risk class config for consistent styling
    const config = riskClass ? RISK_CLASS_CONFIG[riskClass] : null;
    
    if (transferResult.status === 'verified') {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified Transfer to {targetSchool}
          </Badge>
          {config && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              {config.label} • Confidence: {transferResult.confidence ? `${Math.round(transferResult.confidence * 100)}%` : 'N/A'}
            </span>
          )}
        </div>
      );
    }
    
    if (transferResult.status === 'elective') {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Check className="h-3 w-3 mr-1" />
            Transfers as Elective
          </Badge>
          <span className="text-xs text-muted-foreground">
            Will count toward elective credits, not major requirements
          </span>
        </div>
      );
    }
    
    if (transferResult.status === 'review') {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
          <span className="text-xs text-muted-foreground">
            Transfer possible but requires registrar evaluation
          </span>
        </div>
      );
    }
    
    // Unknown status
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="text-muted-foreground">
          <FileQuestion className="h-3 w-3 mr-1" />
          Transfer status unknown
        </Badge>
        <span className="text-xs text-muted-foreground">
          No transfer rule found. Contact {targetSchool} registrar for evaluation.
        </span>
      </div>
    );
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'verified': return <CheckCircle2 className="h-3 w-3 text-green-600" />;
      case 'elective': return <Check className="h-3 w-3 text-blue-600" />;
      case 'review': return <ShieldAlert className="h-3 w-3 text-amber-600" />;
      default: return <HelpCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Quick Add Course
        </CardTitle>
        <CardDescription>
          Add completed courses from alternative credit providers. Transfer status is verified against {targetSchool}'s official policies.
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
                  <CommandEmpty>No courses found for {selectedProvider}.</CommandEmpty>
                  <CommandGroup>
                    {allCourses.slice(0, 30).map((course) => (
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
          <div className="p-3 rounded-lg bg-muted/50 border">
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
            <div className={cn(
              "flex items-center gap-2 text-sm",
              gradeWarning.severity === 'error' ? 'text-destructive' : 'text-amber-600'
            )}>
              <AlertCircle className="h-4 w-4" />
              {gradeWarning.text}
            </div>
          )}
        </div>

        {/* Add Button */}
        <Button 
          onClick={handleAddCourse}
          disabled={!selectedCourse || !grade || addCourseMutation.isPending || grade === 'Fail'}
          className="w-full"
        >
          {addCourseMutation.isPending ? (
            "Adding..."
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Completed Course
            </>
          )}
        </Button>

        {/* Recently Added */}
        {recentlyAdded.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-muted-foreground text-xs">Recently Added</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {recentlyAdded.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {getStatusIcon(item.status)}
                  <span className="ml-1">{item.code}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
