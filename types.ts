
export interface ComparisonResult {
  match: boolean;
  similarityPercentage: number;
  reasoning: string;
  confidence?: number; // Optional confidence score between 0 and 1
}
