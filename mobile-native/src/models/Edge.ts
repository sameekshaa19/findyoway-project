export interface Edge {
  from: string;
  to: string;
  distance: number;
  walkingTime: number;
  accessibilityScore: number;
  crowdScore: number;
  floorChange: boolean;
}
