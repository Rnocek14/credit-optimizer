import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Sparkles, MapPin, Trophy, Star, Brain, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface SearchResult {
  id: string;
  name: string;
  role_title: string;
  location: string;
  years_experience: number;
  overall_score: number;
  taglines: string[];
  reasoning: string;
  industry: string;
  mentor_verified: boolean;
  portfolio_count: number;
  external_proof_count: number;
}

const Discover = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");

  // Apply filters to results
  useEffect(() => {
    let filtered = results;

    if (roleFilter !== "all") {
      filtered = filtered.filter(candidate => 
        candidate.role_title.toLowerCase().includes(roleFilter.toLowerCase())
      );
    }

    if (industryFilter !== "all") {
      filtered = filtered.filter(candidate => 
        candidate.industry?.toLowerCase().includes(industryFilter.toLowerCase())
      );
    }

    if (scoreFilter !== "all") {
      const [min, max] = scoreFilter.split("-").map(Number);
      filtered = filtered.filter(candidate => 
        candidate.overall_score >= min && (max ? candidate.overall_score <= max : true)
      );
    }

    setFilteredResults(filtered);
  }, [results, roleFilter, industryFilter, scoreFilter]);

  const generateAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await fetch("/api/generate-search-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) throw new Error("Failed to generate suggestions");

      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Suggestion error:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/discover-talent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results?.length === 0) {
        toast.info("No matches found. Try adjusting your search criteria.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCandidateBadges = (candidate: SearchResult) => {
    const badges = [];
    
    if (candidate.overall_score >= 90) {
      badges.push({ text: "Top 10%", icon: Star, variant: "default" as const, className: "bg-yellow-500 text-yellow-50" });
    }
    
    if (candidate.portfolio_count >= 3) {
      badges.push({ text: "Best Portfolio", icon: Brain, variant: "secondary" as const });
    }
    
    if (candidate.external_proof_count >= 2) {
      badges.push({ text: "External Proof", icon: ExternalLink, variant: "outline" as const });
    }

    return badges;
  };

  const exampleQueries = [
    "Show me PMs with strong UX skills",
    "Top AI engineers in SF with portfolio proof", 
    "Full-stack developers with startup experience",
    "Data scientists with machine learning expertise"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">AI-Powered Talent Discovery</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Find the perfect candidates using natural language search
          </p>

          {/* Search Bar */}
          <div className="flex gap-3 max-w-2xl mx-auto mb-6">
            <Input
              placeholder="e.g., 'Senior React developers with design skills in NYC'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="text-base"
            />
            <Button onClick={handleSearch} disabled={loading} size="lg">
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* AI Suggestions and Example Queries */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Button 
                onClick={generateAISuggestions} 
                disabled={loadingSuggestions}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Zap className="w-4 h-4" />
                {loadingSuggestions ? "Generating..." : "Ask AI"}
              </Button>
              <span className="text-sm text-muted-foreground">for smart query suggestions</span>
            </div>

            {/* AI Generated Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="text-sm text-muted-foreground mr-2">AI Suggests:</span>
                {aiSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(suggestion)}
                    className="text-xs bg-primary/5 border-primary/20"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}

            {/* Example Queries */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-muted-foreground mr-2">Try:</span>
              {exampleQueries.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">
                Found {filteredResults.length} candidate{filteredResults.length !== 1 ? "s" : ""}
                {filteredResults.length !== results.length && (
                  <span className="text-base text-muted-foreground ml-2">
                    (filtered from {results.length})
                  </span>
                )}
              </h2>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="data">Data Scientist</SelectItem>
                    <SelectItem value="product">Product Manager</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="90-100">90-100 (Elite)</SelectItem>
                    <SelectItem value="80-89">80-89 (Strong)</SelectItem>
                    <SelectItem value="70-79">70-79 (Good)</SelectItem>
                    <SelectItem value="60-69">60-69 (Entry)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((candidate) => {
                const badges = getCandidateBadges(candidate);
                return (
                  <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{candidate.name}</CardTitle>
                          <p className="text-muted-foreground">{candidate.role_title}</p>
                        </div>
                        <Badge variant="secondary" className="font-bold">
                          {candidate.overall_score}/100
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {candidate.location} • {candidate.years_experience} years
                        </div>
                        {candidate.mentor_verified && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>

                      {/* Enhanced Badges */}
                      {badges.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {badges.map((badge, index) => {
                            const Icon = badge.icon;
                            return (
                              <Badge 
                                key={index} 
                                variant={badge.variant}
                                className={`text-xs ${badge.className || ""}`}
                              >
                                <Icon className="w-3 h-3 mr-1" />
                                {badge.text}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {candidate.taglines && candidate.taglines.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.taglines.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Proof indicators */}
                      {(candidate.portfolio_count > 0 || candidate.external_proof_count > 0) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {candidate.portfolio_count > 0 && (
                            <span>📁 {candidate.portfolio_count} portfolio items</span>
                          )}
                          {candidate.external_proof_count > 0 && (
                            <span>🔗 {candidate.external_proof_count} external proofs</span>
                          )}
                        </div>
                      )}

                      {candidate.reasoning && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {candidate.reasoning}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link to={`/resume/${candidate.id}?public=true`}>
                            View Resume
                          </Link>
                        </Button>
                        {candidate.overall_score >= 90 && (
                          <Badge variant="default" className="bg-yellow-500 text-yellow-50 self-center">
                            <Trophy className="w-3 h-3 mr-1" />
                            Top
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No candidates found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or using different keywords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;