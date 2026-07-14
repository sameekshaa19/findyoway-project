import type { NavigationGraph, RouteResult, Node } from '../../models';
import { findPath, type OptimizationCriterion } from './pathfinding/AStar';
import { parseGraphJson } from './graphLoader';
import { validateGraph, type ValidationError } from './validateGraph';

export class NavigationEngine {
  private graph: NavigationGraph | null = null;

  loadGraph(
    rawJson: any,
    venueId: string,
    venueName: string,
  ): { success: boolean; errors?: ValidationError[] } {
    this.graph = parseGraphJson(rawJson, venueId, venueName);

    const errors = validateGraph(this.graph);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true };
  }

  getGraph(): NavigationGraph | null {
    return this.graph;
  }

  findRoute(
    startNodeId: string,
    goalNodeId: string,
    criterion: OptimizationCriterion = 'shortest',
  ): RouteResult | null {
    if (!this.graph) return null;
    return findPath(this.graph, startNodeId, goalNodeId, criterion);
  }

  findNearestNode(latitude: number, longitude: number): Node | null {
    if (!this.graph) return null;
    return null;
  }

  getNodeById(nodeId: string): Node | null {
    if (!this.graph) return null;
    return this.graph.nodes.get(nodeId) ?? null;
  }

  getLandmarksByType(type: string): Node[] {
    if (!this.graph) return [];
    return Array.from(this.graph.nodes.values()).filter((n) => n.type === type);
  }

  getAllEntrances(): Node[] {
    return this.getLandmarksByType('entrance');
  }

  getFloors(): number[] {
    if (!this.graph) return [];
    return this.graph.floors.map((f) => f.level);
  }
}

export const navigationEngine = new NavigationEngine();
