export type InstructionType = 'turn' | 'continue' | 'arrive' | 'floorChange' | 'alert' | 'depart';

export interface Instruction {
  text: string;
  nodeId: string;
  type: InstructionType;
  distance?: number;
  floor?: number;
}
