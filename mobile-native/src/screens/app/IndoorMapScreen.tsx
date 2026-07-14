import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { LoadingState } from '../../components/app/LoadingState';
import { ErrorState } from '../../components/app/ErrorState';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Node } from '../../models';
import { ScreenLayout } from './ScreenLayout';
import { fetchFloorPlan } from '../../services/venueService';
import { navigationEngine } from '../../services/navigationEngine/NavigationEngine';

type Props = NativeStackScreenProps<RootStackParamList, 'IndoorMap'>;

type SelectionMode = 'none' | 'selectingStart' | 'selectingGoal';

export function IndoorMapScreen({ navigation, route }: Props) {
  const { venueId, venueName } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [selectedStart, setSelectedStart] = useState<Node | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Node | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [currentFloor, setCurrentFloor] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchFloorPlan(venueId);
        const result = navigationEngine.loadGraph(
          data.graph_json,
          venueId,
          venueName,
        );
        if (!cancelled) {
          if (!result.success && result.errors) {
            setLoadError(
              'Floor plan has issues: ' +
                result.errors.map((e) => e.message).join('; '),
            );
          }
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [venueId, venueName]);

  const graph = navigationEngine.getGraph();
  const floors = graph?.floors ?? [];

  const floorNodes = useMemo(() => {
    if (!graph) return [];
    return Array.from(graph.nodes.values()).filter(
      (n) => n.floor === currentFloor,
    );
  }, [graph, currentFloor]);

  const floorEdges = useMemo(() => {
    if (!graph) return [];
    const result: { from: Node; to: Node }[] = [];
    const nodeMap = graph.nodes;
    for (const node of floorNodes) {
      const edges = graph.edges.get(node.id) || [];
      for (const edge of edges) {
        const toNode = nodeMap.get(edge.to);
        if (toNode && toNode.floor === currentFloor) {
          result.push({ from: node, to: toNode });
        }
      }
    }
    return result;
  }, [graph, floorNodes, currentFloor]);

  const routePath = useMemo(() => {
    if (!selectedStart || !selectedGoal || !graph) return null;
    const result = navigationEngine.findRoute(
      selectedStart.id,
      selectedGoal.id,
      'shortest',
    );
    return result;
  }, [selectedStart, selectedGoal, graph]);

  const canvasWidth = Dimensions.get('window').width - spacing.md * 2 - spacing.lg * 2;
  const canvasHeight = 400;

  const toCanvasX = (x: number) => x * scale + spacing.lg;
  const toCanvasY = (y: number) => y * scale + spacing.lg;

  function handleNodePress(node: Node) {
    if (selectionMode === 'selectingStart') {
      setSelectedStart(node);
      setSelectionMode('none');
    } else if (selectionMode === 'selectingGoal') {
      setSelectedGoal(node);
      setSelectionMode('none');
    }
  }

  const startLandmarks = graph
    ? Array.from(graph.nodes.values()).filter(
        (n) => n.type === 'entrance' || n.type === 'reception',
      )
    : [];

  if (loading) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Home">
        <AppHeader title={venueName} subtitle="Loading floor plan..." />
        <LoadingState message="Loading indoor map..." />
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Home">
        <AppHeader title={venueName} subtitle="Error" />
        <ErrorState message={error} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home" scrollable={false}>
      <AppHeader title={venueName} subtitle="Select start and destination" />

      {loadError && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{loadError}</Text>
        </View>
      )}

      {/* Floor selector */}
      {floors.length > 1 && (
        <View style={styles.floorTabs}>
          {floors.map((f) => (
              <Pressable
                key={f.level}
                style={[
                  styles.floorTab,
                  currentFloor === f.level && styles.floorTabActive,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: currentFloor === f.level }}
                accessibilityLabel={`Switch to ${f.label}`}
                onPress={() => setCurrentFloor(f.level)}
              >
                <Text
                  style={[
                    styles.floorTabLabel,
                    currentFloor === f.level && styles.floorTabLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
          ))}
        </View>
      )}

      {/* Selection mode buttons */}
      <View style={styles.selectionRow}>
          <Pressable
            style={[
              styles.selectionBtn,
              selectionMode === 'selectingStart' && styles.selectionBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              selectedStart
                ? `Start point: ${selectedStart.label}. Tap to change`
                : 'Set starting point. Tap then select a location on the map.'
            }
            accessibilityState={{ disabled: selectionMode !== 'none' && selectionMode !== 'selectingStart' }}
            onPress={() => setSelectionMode('selectingStart')}
          >
            <Text style={styles.selectionBtnLabel}>
              {selectedStart ? `Start: ${selectedStart.label}` : 'Set Start'}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.selectionBtn,
              selectionMode === 'selectingGoal' && styles.selectionBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              selectedGoal
                ? `Destination: ${selectedGoal.label}. Tap to change`
                : 'Set destination. Tap then select a location on the map.'
            }
            accessibilityState={{ disabled: selectionMode !== 'none' && selectionMode !== 'selectingGoal' }}
            onPress={() => setSelectionMode('selectingGoal')}
          >
            <Text style={styles.selectionBtnLabel}>
              {selectedGoal ? `Goal: ${selectedGoal.label}` : 'Set Destination'}
            </Text>
          </Pressable>
      </View>

      {/* Quick start landmarks */}
      {!selectedStart && startLandmarks.length > 0 && (
        <ScrollView horizontal style={styles.landmarkScroll}>
          {startLandmarks.map((node) => (
            <Pressable
              key={node.id}
              style={styles.landmarkChip}
              accessibilityRole="button"
              accessibilityLabel={`Set start point to ${node.label}`}
              onPress={() => {
                setSelectedStart(node);
                if (node.floor !== currentFloor) setCurrentFloor(node.floor);
              }}
            >
              <Text style={styles.landmarkChipLabel}>
                I'm at {node.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Map canvas */}
      <View style={styles.mapContainer}>
        <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
          {floorEdges.map((edge, i) => {
            const isOnRoute =
              routePath?.path.some(
                (n) => n.id === edge.from.id || n.id === edge.to.id,
              ) ?? false;
            return (
              <View
                key={`edge-${i}`}
                style={[
                  styles.edgeLine,
                  {
                    left: toCanvasX(edge.from.x),
                    top: toCanvasY(edge.from.y),
                    width: Math.sqrt(
                      (edge.to.x - edge.from.x) ** 2 +
                        (edge.to.y - edge.from.y) ** 2,
                    ) * scale,
                    transform: [
                      {
                        rotate: `${Math.atan2(
                          edge.to.y - edge.from.y,
                          edge.to.x - edge.from.x,
                        )}rad`,
                      },
                    ],
                  },
                  isOnRoute && styles.edgeLineActive,
                ]}
              />
            );
          })}

          {floorNodes.map((node) => {
            const isStart = selectedStart?.id === node.id;
            const isGoal = selectedGoal?.id === node.id;
            const isOnRoute = routePath?.path.some(
              (n) => n.id === node.id,
            );
            const isFloorChange = node.type === 'elevator' || node.type === 'stairs';
            return (
              <Pressable
                key={node.id}
                style={[
                  styles.node,
                  {
                    left: toCanvasX(node.x) - 20,
                    top: toCanvasY(node.y) - 20,
                  },
                  isStart && styles.nodeStart,
                  isGoal && styles.nodeGoal,
                  isOnRoute && styles.nodeOnRoute,
                  isOnRoute && isFloorChange && styles.nodeFloorChange,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${node.label}, ${node.type}${isStart ? ', selected as start' : ''}${isGoal ? ', selected as destination' : ''}${isOnRoute && isFloorChange ? ', floor change point' : ''}`}
                onPress={() => handleNodePress(node)}
              >
                <Text
                  style={[
                    styles.nodeLabel,
                    (isStart || isGoal) && styles.nodeLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {node.label}
                </Text>
                {isOnRoute && isFloorChange && (
                  <Text style={styles.floorChangeIcon}>
                    {node.type === 'elevator' ? '🛗' : '↕'}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {selectionMode !== 'none' && (
            <View style={styles.selectionOverlay}>
              <Text style={styles.selectionOverlayText}>
                {selectionMode === 'selectingStart'
                  ? 'Tap a location to set as your starting point'
                  : 'Tap a destination on the map'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Route info */}
      {routePath && (
        <View style={styles.routeInfo} accessible accessibilityLabel={`Route: ${routePath.totalDistance} meters, ${Math.round(routePath.totalTime / 60)} minutes${routePath.floorChanges > 0 ? `, ${routePath.floorChanges} floor changes` : ''}`}>
          <Text style={styles.routeTitle}>
            Route found: {routePath.totalDistance}m (
            {Math.round(routePath.totalTime / 60)} min)
          </Text>
          <Text style={styles.routeSteps}>
            {routePath.instructions.length} steps
            {routePath.floorChanges > 0
              ? ` · ${routePath.floorChanges} floor change(s)`
              : ''}
          </Text>
        </View>
      )}

      {/* Start navigation button */}
      {selectedStart && selectedGoal && (
        <Pressable
          style={styles.startNavBtn}
          accessibilityRole="button"
          accessibilityLabel={`Start navigation from ${selectedStart.label} to ${selectedGoal.label}`}
          onPress={() =>
            navigation.navigate('IndoorRouteView', {
              venueId,
              venueName,
              startNodeId: selectedStart.id,
              goalNodeId: selectedGoal.id,
            })
          }
        >
          <Text style={styles.startNavBtnLabel}>Start Navigation</Text>
        </Pressable>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  warning: {
    backgroundColor: colors.warning + '20',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
    fontSize: 12,
  },
  floorTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  floorTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  floorTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  floorTabLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  floorTabLabelActive: {
    color: colors.text,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  selectionBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '20',
  },
  selectionBtnLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  landmarkScroll: {
    flexGrow: 0,
  },
  landmarkChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    marginRight: spacing.xs,
  },
  landmarkChipLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  canvas: {
    position: 'relative',
  },
  edgeLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.border,
    transformOrigin: 'left center',
  },
  edgeLineActive: {
    backgroundColor: colors.primary,
    height: 3,
  },
  node: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeStart: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  nodeGoal: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  nodeOnRoute: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  nodeFloorChange: {
    borderColor: colors.accent,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  floorChangeIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 12,
  },
  nodeLabel: {
    color: colors.text,
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
  },
  nodeLabelActive: {
    color: colors.text,
    fontSize: 8,
  },
  selectionOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary + 'DD',
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  selectionOverlayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  routeInfo: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  routeTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  routeSteps: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  startNavBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  startNavBtnLabel: {
    color: colors.textDark,
    fontWeight: '800',
    fontSize: 16,
  },
});
