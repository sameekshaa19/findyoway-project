export type LandmarkType = 'restroom' | 'elevator' | 'stairs' | 'entrance' | 'exit' | 'reception' | 'pharmacy' | 'room';

export interface Landmark {
  nodeId: string;
  type: LandmarkType;
  label: string;
}
