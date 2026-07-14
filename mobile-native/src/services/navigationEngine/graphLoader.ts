import type { NavigationGraph, Node, Edge, Floor } from '../../models';

interface RawGraphJson {
  nodes: Record<string, { label: string; x?: number; y?: number; floor?: number; type?: string }>;
  edges: Array<{
    from: string;
    to: string;
    weight?: number;
    distance?: number;
    walkingTime?: number;
    accessibilityScore?: number;
    crowdScore?: number;
    label?: string;
  }>;
}

export function parseGraphJson(
  raw: RawGraphJson,
  venueId: string,
  venueName: string,
): NavigationGraph {
  const nodes = new Map<string, Node>();
  const edgeMap = new Map<string, Edge[]>();
  const floorSet = new Set<number>();
  const landmarks: Array<{ nodeId: string; type: 'restroom' | 'elevator' | 'stairs' | 'entrance' | 'exit' | 'reception' | 'pharmacy' | 'room'; label: string }> = [];

  for (const [id, rawNode] of Object.entries(raw.nodes)) {
    const floor = rawNode.floor ?? 0;
    const type = (rawNode.type ?? 'room') as Node['type'];
    const node: Node = {
      id,
      label: rawNode.label,
      floor,
      x: rawNode.x ?? 0,
      y: rawNode.y ?? 0,
      type,
    };
    nodes.set(id, node);
    floorSet.add(floor);

    if (['entrance', 'exit', 'elevator', 'stairs', 'restroom', 'reception', 'pharmacy'].includes(type)) {
      landmarks.push({
        nodeId: id,
        type: type as any,
        label: rawNode.label,
      });
    }
  }

  for (const rawEdge of raw.edges) {
    const distance = rawEdge.distance ?? rawEdge.weight ?? 1;
    const entry: Edge = {
      from: rawEdge.from,
      to: rawEdge.to,
      distance,
      walkingTime: rawEdge.walkingTime ?? distance * 1.2,
      accessibilityScore: rawEdge.accessibilityScore ?? 1,
      crowdScore: rawEdge.crowdScore ?? 0,
      floorChange: isFloorChange(nodes, rawEdge.from, rawEdge.to),
    };
    addEdge(edgeMap, entry);

    const reverse: Edge = {
      ...entry,
      from: rawEdge.to,
      to: rawEdge.from,
    };
    addEdge(edgeMap, reverse);
  }

  const floors: Floor[] = Array.from(floorSet)
    .sort((a, b) => a - b)
    .map((level) => ({
      level,
      label: level === 0 ? 'Ground' : level > 0 ? `Floor ${level}` : `B${Math.abs(level)}`,
      nodes: Array.from(nodes.values())
        .filter((n) => n.floor === level)
        .map((n) => n.id),
    }));

  return {
    nodes,
    edges: edgeMap,
    floors,
    landmarks: landmarks.map((l) => ({ nodeId: l.nodeId, type: l.type, label: l.label })),
    venueId,
    venueName,
  };
}

function isFloorChange(nodes: Map<string, Node>, fromId: string, toId: string): boolean {
  const from = nodes.get(fromId);
  const to = nodes.get(toId);
  if (!from || !to) return false;
  return from.floor !== to.floor;
}

function addEdge(edgeMap: Map<string, Edge[]>, edge: Edge): void {
  const existing = edgeMap.get(edge.from) || [];
  existing.push(edge);
  edgeMap.set(edge.from, existing);
}
