import type { Node } from './Node';
import type { Instruction } from './Instruction';

export interface RouteResult {
  path: Node[];
  instructions: Instruction[];
  totalDistance: number;
  totalTime: number;
  floorChanges: number;
}
