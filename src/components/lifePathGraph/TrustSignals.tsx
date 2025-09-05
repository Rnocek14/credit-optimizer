// Trust Signals - Critical decision-making information for users
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle, Award, Clock, Target } from 'lucide-react';
import { GraphNode } from '@/types/lifePathGraph';

interface TrustSignalsProps {
  node: GraphNode;
  compact?: boolean;
}

/**
 * Career Readiness Index (CRI) Badge - 0-100 score
 */
function CRIBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${getColorClass(score)}`} />
        <span className="text-xs font-medium">{score}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Target className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">CRI</span>
      </div>
      <div className="flex items-center gap-1">
        <div className={`w-12 h-1.5 rounded-full bg-muted relative overflow-hidden`}>
          <div 
            className={`h-full rounded-full transition-all ${getColorClass(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs font-semibold min-w-[2ch]">{score}</span>
      </div>
    </div>
  );
}

/**
 * Difficulty Ring - 1-10 visual indicator around node
 */
function DifficultyIndicator({ difficulty, compact = false }: { difficulty: number; compact?: boolean }) {
  const dots = Array.from({ length: 10 }, (_, i) => i + 1);
  const filled = Math.max(1, Math.min(10, Math.round(difficulty * 2))); // Scale 1-5 to 1-10

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          {dots.slice(0, 5).map((dot) => (
            <div
              key={dot}
              className={`w-1 h-1 rounded-full ${
                dot <= filled / 2 ? 'bg-orange-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{difficulty.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-3 h-3 text-muted-foreground" />
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          {dots.map((dot) => (
            <div
              key={dot}
              className={`w-1.5 h-1.5 rounded-full ${
                dot <= filled ? 'bg-orange-500' : 'bg-muted/50'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          {difficulty.toFixed(1)}/5
        </span>
      </div>
    </div>
  );
}

/**
 * Instructor Rating - Star system 0-5.0
 */
function InstructorRating({ rating, compact = false }: { rating: number; compact?: boolean }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : star - 0.5 <= rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted fill-muted/30'
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * Verification Status - Green checkmark for verified content
 */
function VerificationBadge({ verified, compact = false }: { verified: boolean; compact?: boolean }) {
  if (!verified) return null;
  
  if (compact) {
    return <CheckCircle className="w-3 h-3 text-green-500" />;
  }

  return (
    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
      <CheckCircle className="w-3 h-3 mr-1" />
      Verified
    </Badge>
  );
}

/**
 * Outcome Tags - "Resume", "Capstone", "Portfolio" badges
 */
function OutcomeTags({ outcomes, compact = false }: { outcomes: string[]; compact?: boolean }) {
  if (!outcomes || outcomes.length === 0) return null;
  
  const importantOutcomes = outcomes.filter(outcome => 
    ['resume', 'capstone', 'portfolio', 'certification', 'job'].some(key => 
      outcome.toLowerCase().includes(key)
    )
  );
  
  if (importantOutcomes.length === 0) return null;
  
  if (compact) {
    return (
      <div className="flex gap-1">
        {importantOutcomes.slice(0, 2).map((outcome, i) => (
          <Badge key={i} variant="outline" className="text-xs px-1.5 py-0.5">
            {outcome}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {importantOutcomes.map((outcome, i) => (
        <Badge key={i} variant="outline" className="text-xs">
          <Award className="w-3 h-3 mr-1" />
          {outcome}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Main Trust Signals Component
 */
export function TrustSignals({ node, compact = false }: TrustSignalsProps) {
  // Extract trust signal data from node
  const cri = node.metadata?.cri || node.metadata?.careerReadinessIndex || 0;
  const difficulty = node.difficulty || 3;
  const instructorRating = node.metadata?.instructorRating || node.metadata?.rating || 0;
  const verified = node.validated || node.metadata?.verified || false;
  const outcomes = node.skillOutcomes || node.metadata?.outcomes || [];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {cri > 0 && <CRIBadge score={cri} compact />}
        {instructorRating > 0 && <InstructorRating rating={instructorRating} compact />}
        <VerificationBadge verified={verified} compact />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Primary trust signals */}
      <div className="flex items-center justify-between">
        {cri > 0 && <CRIBadge score={cri} />}
        <VerificationBadge verified={verified} />
      </div>
      
      {/* Secondary indicators */}
      <div className="flex items-center justify-between">
        <DifficultyIndicator difficulty={difficulty} />
        {instructorRating > 0 && <InstructorRating rating={instructorRating} />}
      </div>
      
      {/* Outcome tags */}
      <OutcomeTags outcomes={outcomes} />
    </div>
  );
}