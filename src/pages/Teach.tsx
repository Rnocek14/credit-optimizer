import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen,
  Plus,
  Search,
  Youtube,
  FileText,
  GraduationCap,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  User,
  ExternalLink
} from "lucide-react";

// Mock skill data (you can replace this with actual skill tree data)
const demoSkillTreeData = [
  { id: 'react-basics', name: 'React Fundamentals', category: 'Frontend' },
  { id: 'react-hooks', name: 'React Hooks', category: 'Frontend' },
  { id: 'typescript', name: 'TypeScript', category: 'Frontend' },
  { id: 'nodejs-api', name: 'Node.js API Development', category: 'Backend' },
  { id: 'python-basics', name: 'Python Fundamentals', category: 'Backend' },
  { id: 'aws-basics', name: 'AWS Cloud Basics', category: 'Cloud' },
  { id: 'docker', name: 'Docker Containers', category: 'DevOps' },
  { id: 'kubernetes', name: 'Kubernetes', category: 'DevOps' },
  { id: 'data-structures', name: 'Data Structures', category: 'Computer Science' },
  { id: 'algorithms', name: 'Algorithms', category: 'Computer Science' },
  { id: 'machine-learning', name: 'Machine Learning', category: 'Data Science' },
  { id: 'sql-databases', name: 'SQL Databases', category: 'Backend' }
];

type ContributionType = 'Video' | 'Article' | 'Course' | 'Experience' | 'Other';

type Contribution = {
  id: string;
  skill_id: string;
  skill_name: string;
  title: string;
  description: string;
  link?: string;
  type: ContributionType;
  tags: string[];
  proposed_xp: number;
  status: 'pending' | 'approved';
  is_author: boolean;
  created_at: string;
};

const contributionTypes: ContributionType[] = ['Video', 'Article', 'Course', 'Experience', 'Other'];

const Teach = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [searchSkill, setSearchSkill] = useState('');
  const [formData, setFormData] = useState({
    skill_id: '',
    title: '',
    description: '',
    link: '',
    type: '' as ContributionType | '',
    tags: '',
    proposed_xp: 20,
    is_author: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const filteredSkills = demoSkillTreeData.filter(skill =>
    skill.name.toLowerCase().includes(searchSkill.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchSkill.toLowerCase())
  );

  const getTypeIcon = (type: ContributionType) => {
    switch (type) {
      case 'Video': return <Youtube className="h-4 w-4 text-red-500" />;
      case 'Article': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'Course': return <GraduationCap className="h-4 w-4 text-green-500" />;
      case 'Experience': return <Heart className="h-4 w-4 text-pink-500" />;
      default: return <BookOpen className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusIcon = (status: 'pending' | 'approved') => {
    return status === 'approved' 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.skill_id || !formData.title || !formData.type) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in skill, title, and content type.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const skill = demoSkillTreeData.find(s => s.id === formData.skill_id);
    const newContribution: Contribution = {
      id: Date.now().toString(),
      skill_id: formData.skill_id,
      skill_name: skill?.name || '',
      title: formData.title,
      description: formData.description,
      link: formData.link || undefined,
      type: formData.type as ContributionType,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      proposed_xp: formData.proposed_xp,
      status: 'pending',
      is_author: formData.is_author,
      created_at: new Date().toISOString()
    };

    setContributions(prev => [newContribution, ...prev]);
    
    // Reset form
    setFormData({
      skill_id: '',
      title: '',
      description: '',
      link: '',
      type: '',
      tags: '',
      proposed_xp: 20,
      is_author: false
    });
    
    setIsSubmitting(false);
    
    toast({
      title: "Thanks! Your submission is under review.",
      description: "We'll review your contribution and get back to you soon.",
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto p-6 max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            <BookOpen className="h-10 w-10" />
            Teach & Share
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Contribute to the Life Path learning ecosystem by sharing valuable resources, 
            tutorials, and your personal learning experiences
          </p>
        </div>

        {/* Contribution Form */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Submit a Learning Resource
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Skill Selection */}
              <div className="space-y-2">
                <Label htmlFor="skill" className="text-slate-200">Choose a Skill *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search skills..."
                    value={searchSkill}
                    onChange={(e) => setSearchSkill(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                  />
                </div>
                {searchSkill && (
                  <div className="bg-slate-800 border border-slate-600 rounded-lg max-h-40 overflow-y-auto z-50">
                    {filteredSkills.map(skill => (
                      <div
                        key={skill.id}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                        onClick={() => {
                          handleInputChange('skill_id', skill.id);
                          setSearchSkill(skill.name);
                        }}
                      >
                        <div className="font-medium text-slate-200">{skill.name}</div>
                        <div className="text-xs text-slate-400">{skill.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Content Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-200">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., How I Learned React Hooks"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-slate-200">Content Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {contributionTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-slate-100 hover:bg-slate-700">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(type)}
                            {type}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link" className="text-slate-200">Link (optional)</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://..."
                  value={formData.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-200">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the resource and why it's valuable for learning this skill..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-500">Supports basic markdown formatting</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-slate-200">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="beginner, UI, async, forms"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-500">Separate tags with commas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xp" className="text-slate-200">Proposed XP Value</Label>
                  <Input
                    id="xp"
                    type="number"
                    min="1"
                    max="200"
                    value={formData.proposed_xp}
                    onChange={(e) => handleInputChange('proposed_xp', parseInt(e.target.value) || 20)}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                  />
                  <p className="text-xs text-slate-500">How much XP should learners earn?</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="author"
                  checked={formData.is_author}
                  onCheckedChange={(checked) => handleInputChange('is_author', checked)}
                />
                <Label htmlFor="author" className="text-slate-200 text-sm">
                  I'm the author/creator of this content
                </Label>
              </div>

              <Separator className="bg-slate-700" />

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Your Submissions */}
        {contributions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="h-6 w-6" />
              Your Submissions ({contributions.length})
            </h2>

            <div className="grid gap-4">
              {contributions.map((contribution) => (
                <Card key={contribution.id} className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {getTypeIcon(contribution.type)}
                        <div>
                          <h3 className="font-semibold text-slate-100">{contribution.title}</h3>
                          <p className="text-sm text-slate-400">{contribution.skill_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(contribution.status)}
                        <Badge 
                          variant={contribution.status === 'approved' ? 'default' : 'secondary'}
                          className={contribution.status === 'approved' 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }
                        >
                          {contribution.status === 'approved' ? 'Approved' : 'Pending Review'}
                        </Badge>
                      </div>
                    </div>

                    {contribution.description && (
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                        {contribution.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {contribution.tags.length > 0 && (
                          <div className="flex gap-1">
                            {contribution.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Star className="h-3 w-3" />
                          {contribution.proposed_xp} XP
                        </div>
                        {contribution.is_author && (
                          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                            Author
                          </Badge>
                        )}
                      </div>
                      
                      {contribution.link && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={contribution.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      Submitted {new Date(contribution.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teach;