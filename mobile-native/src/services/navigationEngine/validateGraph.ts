import type { NavigationGraph } from '../../models';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGraph(graph: NavigationGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  if (graph.nodes.size === 0) {
    errors.push({ field: 'nodes', message: 'Graph has no nodes' });
    return errors;
  }

  if (graph.floors.length === 0) {
    errors.push({ field: 'floors', message: 'Graph has no floors defined' });
  }

  const hasEntrance = Array.from(graph.nodes.values()).some(
    (n) => n.type === 'entrance',
  );
  if (!hasEntrance) {
    errors.push({ field: 'nodes', message: 'No entrance node found. Add at least one entrance.' });
  }

  const hasExit = Array.from(graph.nodes.values()).some(
    (n) => n.type === 'exit',
  );
  if (!hasExit) {
    errors.push({ field: 'nodes', message: 'No exit node found. Add at least one exit.' });
  }

  const nodeIds = new Set(graph.nodes.keys());

  for (const [nodeId, edges] of graph.edges.entries()) {
    if (!nodeIds.has(nodeId)) {
      errors.push({ field: 'edges', message: `Edge references unknown node: ${nodeId}` });
      continue;
    }
    for (const edge of edges) {
      if (!nodeIds.has(edge.to)) {
        errors.push({
          field: 'edges',
          message: `Edge from "${nodeId}" references unknown node: "${edge.to}"`,
        });
      }
    }
  }

  const visited = new Set<string>();
  const queue = [graph.nodes.keys().next().value];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = graph.edges.get(current) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  if (visited.size !== graph.nodes.size) {
    const unreachableCount = graph.nodes.size - visited.size;
    errors.push({
      field: 'graph',
      message: `Graph is disconnected. ${unreachableCount} node(s) are unreachable from the first node.`,
    });
  }

  const duplicateIds = new Set<string>();
  const seen = new Set<string>();
  for (const id of graph.nodes.keys()) {
    if (seen.has(id)) duplicateIds.add(id);
    seen.add(id);
  }
  if (duplicateIds.size > 0) {
    errors.push({
      field: 'nodes',
      message: `Duplicate node IDs found: ${Array.from(duplicateIds).join(', ')}`,
    });
  }

  return errors;
}
