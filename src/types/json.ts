// types/json.ts
export type Json =
  | string 
  | number 
  | boolean 
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type JsonArray = Json[];

// Strong type for CRI history rows
export type CriHistoryRow = {
  score: number;
  calculated_at: string; // ISO timestamp
  version?: string;
};

// Database-safe CRI calculation data
export type CriCalculationData = {
  instructor_data?: Json;
  platform_analysis?: Json;
  skill_analysis?: Json;
  market_data?: Json;
  [key: string]: Json | undefined;
};