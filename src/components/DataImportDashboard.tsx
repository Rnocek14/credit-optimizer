import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataImport } from "@/hooks/useDataImport";
import { LinkedInImport } from "@/components/LinkedInImport";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain,
  TrendingUp,
  Users,
  Database
} from "lucide-react";
import { format } from "date-fns";

export function DataImportDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    imports,
    skillExtractions,
    importStats,
    isLoadingImports,
    isLoadingSkills,
    validateSkill,
    isValidatingSkill,
  } = useDataImport();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getImportTypeIcon = (type: string) => {
    switch (type) {
      case 'linkedin':
        return '💼';
      case 'resume':
        return '📄';
      case 'transcript':
        return '🎓';
      default:
        return '📊';
    }
  };

  if (isLoadingImports || isLoadingSkills) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importStats.totalImports}</div>
            <p className="text-xs text-muted-foreground">
              {importStats.completedImports} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills Extracted</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importStats.totalSkills}</div>
            <p className="text-xs text-muted-foreground">
              {importStats.validatedSkills} validated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {importStats.totalImports > 0 
                ? Math.round((importStats.completedImports / importStats.totalImports) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {importStats.failedImports} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(importStats.bySource).filter(count => count > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              sources connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="imports">Import History</TabsTrigger>
          <TabsTrigger value="skills">Extracted Skills</TabsTrigger>
          <TabsTrigger value="new">New Import</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
                <CardDescription>Your latest data import activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {imports.slice(0, 5).map((imp) => (
                    <div key={imp.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getImportTypeIcon(imp.import_type)}</span>
                        <div>
                          <p className="text-sm font-medium capitalize">{imp.import_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(imp.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(imp.import_status)}
                        <Badge variant={imp.import_status === 'completed' ? 'default' : 'secondary'}>
                          {imp.import_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {imports.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No imports yet. Start by connecting a data source.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skill Validation</CardTitle>
                <CardDescription>Review and validate AI-extracted skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skillExtractions
                    .filter(skill => !skill.validated)
                    .slice(0, 5)
                    .map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(skill.confidence_score * 100)}% confidence
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateSkill({ skillId: skill.id, validated: true })}
                          disabled={isValidatingSkill}
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => validateSkill({ skillId: skill.id, validated: false })}
                          disabled={isValidatingSkill}
                        >
                          ✗
                        </Button>
                      </div>
                    </div>
                  ))}
                  {skillExtractions.filter(skill => !skill.validated).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      All skills have been validated.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="imports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Complete history of your data imports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {imports.map((imp) => (
                  <div key={imp.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getImportTypeIcon(imp.import_type)}</span>
                        <div>
                          <h4 className="font-medium capitalize">{imp.import_type} Import</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(imp.created_at), 'PPpp')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(imp.import_status)}
                        <Badge variant={imp.import_status === 'completed' ? 'default' : 'secondary'}>
                          {imp.import_status}
                        </Badge>
                      </div>
                    </div>
                    
                    {imp.import_status === 'completed' && (
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Confidence: {Math.round(imp.confidence_score * 100)}%</span>
                        {imp.processed_at && (
                          <span>
                            Processed: {format(new Date(imp.processed_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {imp.error_message && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {imp.error_message}
                      </div>
                    )}
                  </div>
                ))}
                
                {imports.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg">No imports yet</h3>
                    <p className="text-muted-foreground">
                      Start importing your career data to get personalized insights
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extracted Skills</CardTitle>
              <CardDescription>AI-powered skill extraction from your career data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillExtractions.map((skill) => (
                  <div key={skill.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {skill.skill_category} • {skill.extraction_source}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={skill.validated ? 'default' : 'secondary'}>
                          {Math.round(skill.confidence_score * 100)}% confidence
                        </Badge>
                        {skill.validated ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateSkill({ skillId: skill.id, validated: true })}
                              disabled={isValidatingSkill}
                            >
                              ✓
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateSkill({ skillId: skill.id, validated: false })}
                              disabled={isValidatingSkill}
                            >
                              ✗
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {skill.context_snippet && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        "{skill.context_snippet}"
                      </p>
                    )}
                  </div>
                ))}
                
                {skillExtractions.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg">No skills extracted yet</h3>
                    <p className="text-muted-foreground">
                      Import your career data to automatically extract relevant skills
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LinkedInImport onImportComplete={() => setActiveTab("overview")} />
            
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Resume Upload</span>
                </CardTitle>
                <CardDescription>Coming soon - Upload and parse resume files</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
            
            <Card className="opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Transcript Upload</span>
                </CardTitle>
                <CardDescription>Coming soon - Upload academic transcripts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Upload Transcript
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}