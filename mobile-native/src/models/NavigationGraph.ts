import type { Node } from './Node';
import type { Edge } from './Edge';
import type { Floor } from './Floor';
import type { Landmark } from './Landmark';

export interface NavigationGraph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge[]>;
  floors: Floor[];
  landmarks: Landmark[];
  venueId: string;
  venueName: string;
}
