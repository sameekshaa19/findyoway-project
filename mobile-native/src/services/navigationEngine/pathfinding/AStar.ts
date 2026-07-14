import type { NavigationGraph, Node, RouteResult, Instruction } from '../../../models';
import { BinaryHeap } from './BinaryHeap';

export type OptimizationCriterion = 'shortest' | 'fastest' | 'wheelchair' | 'emergency';

interface AStarNode {
  nodeId: string;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
  edgeWeight?: number;
  floorChange?: boolean;
}

function heuristic(a: Node, b: Node): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const floorDiff = Math.abs(a.floor - b.floor) * 100;
  return Math.sqrt(dx * dx + dy * dy) + floorDiff;
}

function edgeCost(
  graph: NavigationGraph,
  from: string,
  to: string,
  criterion: OptimizationCriterion,
): number {
  const edges = graph.edges.get(from) || [];
  const edge = edges.find((e) => e.to === to);
  if (!edge) return Infinity;

  switch (criterion) {
    case 'shortest':
      return edge.distance + (edge.floorChange ? 50 : 0);
    case 'fastest':
      return edge.walkingTime + (edge.floorChange ? 60 : 0);
    case 'wheelchair':
      return edge.distance * (edge.accessibilityScore > 0 ? 1 / edge.accessibilityScore : 10)
        + (edge.floorChange ? 200 : 0);
    case 'emergency':
      const fromNode = graph.nodes.get(from);
      const isElevator = fromNode?.type === 'elevator';
      return edge.distance + (edge.floorChange ? 30 : 0) + (isElevator ? 500 : 0);
  }
}

export function findPath(
  graph: NavigationGraph,
  startId: string,
  goalId: string,
  criterion: OptimizationCriterion = 'shortest',
): RouteResult | null {
  const startNode = graph.nodes.get(startId);
  const goalNode = graph.nodes.get(goalId);
  if (!startNode || !goalNode) return null;

  const openSet = new BinaryHeap<AStarNode>((n) => n.f);
  const closedSet = new Set<string>();
  const gScores = new Map<string, number>();

  const start: AStarNode = {
    nodeId: startId,
    g: 0,
    h: heuristic(startNode, goalNode),
    f: heuristic(startNode, goalNode),
    parent: null,
  };
  openSet.push(start);
  gScores.set(startId, 0);

  while (openSet.size > 0) {
    const current = openSet.pop();
    if (!current) break;
    if (current.nodeId === goalId) {
      return reconstructPath(current, graph, criterion);
    }
    if (closedSet.has(current.nodeId)) continue;
    closedSet.add(current.nodeId);

    const neighbors = graph.edges.get(current.nodeId) || [];
    for (const edge of neighbors) {
      if (closedSet.has(edge.to)) continue;

      const neighborNode = graph.nodes.get(edge.to);
      if (!neighborNode) continue;

      const cost = edgeCost(graph, current.nodeId, edge.to, criterion);
      if (cost === Infinity) continue;

      const tentativeG = current.g + cost;
      const existingG = gScores.get(edge.to);

      if (existingG !== undefined && tentativeG >= existingG) continue;

      gScores.set(edge.to, tentativeG);
      const h = heuristic(neighborNode, goalNode);
      const neighbor: AStarNode = {
        nodeId: edge.to,
        g: tentativeG,
        h,
        f: tentativeG + h,
        parent: current,
        edgeWeight: edge.distance,
        floorChange: edge.floorChange,
      };
      openSet.push(neighbor);
    }
  }

  return null;
}

function reconstructPath(
  node: AStarNode,
  graph: NavigationGraph,
  criterion: OptimizationCriterion,
): RouteResult {
  const pathNodes: Node[] = [];
  const instructions: Instruction[] = [];
  let current: AStarNode | null = node;
  let totalDistance = 0;
  let totalTime = 0;
  let floorChanges = 0;

  const reversePath: AStarNode[] = [];
  while (current) {
    reversePath.push(current);
    current = current.parent;
  }
  reversePath.reverse();

  for (let i = 0; i < reversePath.length; i++) {
    const step = reversePath[i];
    const graphNode = graph.nodes.get(step.nodeId);
    if (!graphNode) continue;
    pathNodes.push(graphNode);

    if (step.edgeWeight !== undefined) {
      totalDistance += step.edgeWeight;
    }
    if (step.floorChange) {
      floorChanges++;
    }

    if (i === 0) {
      const next = reversePath[i + 1];
      const nextNode = next ? graph.nodes.get(next.nodeId) : null;
      instructions.push({
        text: nextNode ? `Start from ${graphNode.label}` : `You are at ${graphNode.label}`,
        nodeId: step.nodeId,
        type: 'depart',
        floor: graphNode.floor,
      });
    } else if (i === reversePath.length - 1) {
      instructions.push({
        text: `You have arrived at ${graphNode.label}`,
        nodeId: step.nodeId,
        type: 'arrive',
        floor: graphNode.floor,
      });
    } else if (step.floorChange) {
      const prev = reversePath[i - 1];
      const prevNode = prev ? graph.nodes.get(prev.nodeId) : null;
      const floorDir = prevNode && graphNode.floor > prevNode.floor ? 'up' : 'down';
      instructions.push({
        text: `Take the ${graphNode.type === 'elevator' ? 'elevator' : 'stairs'} ${floorDir} to floor ${graphNode.floor}`,
        nodeId: step.nodeId,
        type: 'floorChange',
        floor: graphNode.floor,
      });
    } else {
      const prev = reversePath[i - 1];
      const prevNode = prev ? graph.nodes.get(prev.nodeId) : null;
      const next = reversePath[i + 1];
      const nextNode = next ? graph.nodes.get(next.nodeId) : null;
      if (prevNode && nextNode) {
        const dx = nextNode.x - prevNode.x;
        const dy = nextNode.y - prevNode.y;
        let turnText = 'Continue straight';
        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
          turnText = dx > 0 ? 'Turn right' : 'Turn left';
        } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
          turnText = dy > 0 ? 'Go straight ahead' : 'Go back';
        }
        instructions.push({
          text: `${turnText} toward ${nextNode.label}`,
          nodeId: step.nodeId,
          type: 'turn',
          distance: step.edgeWeight,
          floor: graphNode.floor,
        });
      }
    }
  }

  totalTime = totalDistance * 1.2;

  return {
    path: pathNodes,
    instructions,
    totalDistance,
    totalTime,
    floorChanges,
  };
}
