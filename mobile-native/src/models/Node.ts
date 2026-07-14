export type NodeType = 'entrance' | 'exit' | 'elevator' | 'stairs' | 'room' | 'junction' | 'landmark' | 'restroom' | 'reception' | 'pharmacy';

export interface Node {
  id: string;
  label: string;
  floor: number;
  x: number;
  y: number;
  type: NodeType;
}
