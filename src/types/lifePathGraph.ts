// Life Path Unified Career Graph - Core Type Definitions
// Based on comprehensive research for multi-objective pathfinding with credit transfer

export type NodeType = 'skill' | 'job' | 'course' | 'project' | 'certification' | 'step' | 'exam';

export type EdgeType = 
  | 'requires' 
  | 'enables' 
  | 'substitutes' 
  | 'transfersTo' 
  | 'builds' 
  | 'pivot' 
  | 'ghost' 
  | 'alternative' 
  | 'stacksTo'
  | 'enhances'
  | 'creditTransfersTo';

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  
  // Core attributes
  estimatedHours: number;
  cost: number;
  credits?: number;
  difficulty: number; // 1-5 scale
  
  // Institutional info
  institution?: string;
  provider?: string;
  modality: 'online' | 'in-person' | 'hybrid' | 'self-paced';
  
  // Status and validation
  active: boolean;
  validated: boolean;
  lastUpdated: string;
  
  // Categorization
  category?: string;
  subcategory?: string;
  tags: string[];
  
  // Prerequisites and outcomes
  prerequisiteIds: string[];
  skillOutcomes: string[];
  
  // Credit transfer specific
  creditValue?: number;
  aceRecommended?: boolean;
  articulationAgreements?: string[];
  
  // Visualization
  position?: { x: number; y: number };
  
  // Metadata
  metadata: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  
  // Multi-objective weights
  weights: {
    time: number;      // hours
    cost: number;      // dollars
    creditLoss: number; // credits lost in transfer
    difficulty: number; // complexity factor
    roi: number;       // return on investment score
  };
  
  // Transfer specific
  creditTransferRate?: number; // 0-1, how much credit transfers
  institutionalCap?: number;   // max credits that can transfer
  residencyRequirement?: number; // min credits that must be earned at target
  
  // Validation and metadata
  confidence: number; // 0-1 confidence in this connection
  source: string;     // data source (ACE, state articulation, etc.)
  validated: boolean;
  
  // Business rules
  conditions?: string[]; // conditions that must be met
  timeConstraints?: {
    minGap?: number;    // minimum time between nodes
    maxGap?: number;    // maximum time between nodes
    seasonal?: string;  // spring, fall, etc.
  };
  
  metadata: Record<string, any>;
}

export interface UserState {
  userId: string;
  
  // Completed work
  completedNodeIds: string[];
  inProgressNodeIds: string[];
  
  // Current goals and preferences
  activeGoalId?: string;
  preferences: {
    maxCost?: number;
    maxTimeMonths?: number;
    preferredModality?: 'online' | 'in-person' | 'hybrid' | 'any';
    location?: string;
    currentInstitution?: string;
  };
  
  // Credit portfolio
  existingCredits: {
    nodeId: string;
    credits: number;
    institution: string;
    dateCompleted: string;
    verified: boolean;
  }[];
  
  // Plan state
  currentPlan?: {
    pathId: string;
    selectedNodes: string[];
    estimatedCompletion: string;
    totalCost: number;
    totalTime: number;
  };
  
  // Checkpoint system for backtracking
  checkpoints: UserCheckpoint[];
  
  lastUpdated: string;
}

export interface UserCheckpoint {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  
  // Snapshot of state at checkpoint
  planSnapshot: {
    goalId?: string;
    selectedNodeIds: string[];
    completedNodeIds: string[];
    preferences: UserState['preferences'];
  };
  
  // Audit trail
  changesSince?: {
    added: string[];
    removed: string[];
    completed: string[];
  };
}

export interface PathResult {
  id: string;
  name: string;
  description: string;
  
  // Path composition
  nodeIds: string[];
  edgeIds: string[];
  
  // Metrics
  totalTime: number;
  totalCost: number;
  totalCredits: number;
  creditLoss: number;
  difficultyScore: number;
  roiScore: number;
  
  // Objectives this path optimizes for
  optimizedFor: ('time' | 'cost' | 'credits' | 'roi')[];
  
  // Ghost path indicators
  hasGhostNodes: boolean;
  missingPrerequisites: string[];
  suggestedAlternatives: string[];
  
  // Validation
  feasible: boolean;
  warnings: string[];
  
  metadata: Record<string, any>;
}

export interface ScoringConfig {
  objectives: {
    time: { weight: number; minimize: boolean };
    cost: { weight: number; minimize: boolean };
    creditLoss: { weight: number; minimize: boolean };
    difficulty: { weight: number; minimize: boolean };
    roi: { weight: number; maximize: boolean };
  };
  
  constraints: {
    maxCost?: number;
    maxTime?: number;
    requiredNodes?: string[];
    excludedNodes?: string[];
  };
  
  userContext: {
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    availableTime: 'part-time' | 'full-time' | 'flexible';
    riskTolerance: 'low' | 'medium' | 'high';
  };
}

// Pathfinding algorithm results
export interface PathfindingResult {
  fastest: PathResult;
  cheapest: PathResult;
  creditMaximized: PathResult;
  paretoFrontier: PathResult[];
  ghostPaths: PathResult[];
  
  // Comparison metrics
  tradeoffs: {
    timeVsCost: { correlation: number; alternatives: PathResult[] };
    costVsCredits: { correlation: number; alternatives: PathResult[] };
  };
  
  recommendations: {
    primary: PathResult;
    alternatives: PathResult[];
    reasoning: string;
  };
}

// Credit Transfer Engine types
export interface CreditTransferRule {
  id: string;
  sourceInstitution: string;
  targetInstitution: string;
  sourceNodeId: string;
  targetNodeId: string;
  
  transferRate: number; // 0-1
  maxCredits?: number;
  conditions: string[];
  
  validFrom: string;
  validTo?: string;
  source: 'state_articulation' | 'ace' | 'nccrs' | 'institutional';
  
  metadata: Record<string, any>;
}

export interface CreditCalculation {
  totalEarnedCredits: number;
  transferableCredits: number;
  creditsLost: number;
  residencyRequirement: number;
  additionalCreditsNeeded: number;
  
  breakdown: {
    nodeId: string;
    earnedCredits: number;
    transferredCredits: number;
    lostCredits: number;
    reason?: string;
  }[];
}