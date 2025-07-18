import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, MapPin, Trophy } from "lucide-react";
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
}

const Discover = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

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

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Found {results.length} candidate{results.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((candidate) => (
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
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      {candidate.location} • {candidate.years_experience} years
                    </div>

                    {candidate.taglines && candidate.taglines.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {candidate.taglines.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
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
              ))}
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