import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import type { Instruction } from '../../models';
import { ScreenLayout } from './ScreenLayout';
import { navigationEngine } from '../../services/navigationEngine/NavigationEngine';
import { speak } from '../../services/speechService';

type Props = NativeStackScreenProps<RootStackParamList, 'IndoorRouteView'>;

export function IndoorRouteViewScreen({ navigation, route }: Props) {
  const { venueId, venueName, startNodeId, goalNodeId } = route.params;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const routeResult = useMemo(() => {
    return navigationEngine.findRoute(startNodeId, goalNodeId, 'shortest');
  }, [startNodeId, goalNodeId]);

  useEffect(() => {
    if (routeResult && routeResult.instructions.length > 0) {
      const first = routeResult.instructions[0];
      speak(first.text);
    }
  }, [routeResult]);

  function handleNext() {
    if (!routeResult) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < routeResult.instructions.length) {
      setCurrentStepIndex(nextIndex);
      speak(routeResult.instructions[nextIndex].text);
    }
  }

  function handlePrev() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  if (!routeResult) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Home">
        <AppHeader title="Route" subtitle="No route found" />
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            Could not find a path between the selected locations.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const currentInstruction: Instruction | undefined =
    routeResult.instructions[currentStepIndex];

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home" scrollable={false}>
      <AppHeader
        title={venueName}
        subtitle="Indoor navigation — follow steps aloud"
      />

      {/* Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {routeResult.totalDistance}m
          </Text>
          <Text style={styles.metricLabel}>Distance</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {Math.round(routeResult.totalTime / 60)} min
          </Text>
          <Text style={styles.metricLabel}>Est. time</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {routeResult.floorChanges}
          </Text>
          <Text style={styles.metricLabel}>Floor changes</Text>
        </View>
      </View>

      {/* Step progress */}
      <Text style={styles.progressText}>
        Step {currentStepIndex + 1} of {routeResult.instructions.length}
      </Text>

      {/* Current instruction */}
      <View
        style={[
          styles.instructionCard,
          currentInstruction?.type === 'floorChange' && styles.instructionCardFloorChange,
        ]}
        accessible
        accessibilityLabel={`Step ${currentStepIndex + 1}: ${currentInstruction?.text}`}
      >
        {currentInstruction?.type === 'floorChange' && (
          <Text style={styles.floorChangeBadge}>
            Floor change
          </Text>
        )}
        <Text style={styles.instructionType}>
          {currentInstruction?.type.toUpperCase()}
        </Text>
        <Text style={styles.instructionText}>
          {currentInstruction?.text}
        </Text>
        {currentInstruction?.distance != null && (
          <Text style={styles.instructionDistance}>
            {Math.round(currentInstruction.distance)}m ahead
          </Text>
        )}
        {currentInstruction?.floor != null && (
          <Text style={styles.instructionFloor}>
            Floor: {currentInstruction.floor === 0 ? 'Ground' : currentInstruction.floor}
          </Text>
        )}
      </View>

      {/* All instructions list */}
      <ScrollView style={styles.stepsList}>
        {routeResult.instructions.map((inst, i) => (
          <View
            key={i}
            style={[
              styles.stepItem,
              i === currentStepIndex && styles.stepItemActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                i === currentStepIndex && styles.stepNumberActive,
              ]}
            >
              {i + 1}
            </Text>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepText,
                  i === currentStepIndex && styles.stepTextActive,
                ]}
                numberOfLines={2}
              >
                {inst.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Navigation controls */}
      <View style={styles.navControls}>
        <Pressable
          style={[styles.navBtn, currentStepIndex === 0 && styles.navBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={currentStepIndex === 0 ? 'At first step' : 'Previous step'}
          onPress={handlePrev}
          disabled={currentStepIndex === 0}
        >
          <Text style={styles.navBtnLabel}>Previous</Text>
        </Pressable>

        <Pressable
          style={styles.speakBtn}
          accessibilityRole="button"
          accessibilityLabel="Repeat current instruction"
          onPress={() => currentInstruction && speak(currentInstruction.text)}
        >
          <Text style={styles.speakBtnLabel}>Repeat</Text>
        </Pressable>

        <Pressable
          style={[
            styles.navBtn,
            styles.navBtnPrimary,
            currentStepIndex >= routeResult.instructions.length - 1 &&
              styles.navBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            currentStepIndex >= routeResult.instructions.length - 1
              ? 'Arrived at destination'
              : 'Next step'
          }
          onPress={handleNext}
          disabled={currentStepIndex >= routeResult.instructions.length - 1}
        >
          <Text style={[styles.navBtnLabel, styles.navBtnLabelPrimary]}>
            {currentStepIndex >= routeResult.instructions.length - 1
              ? 'Arrived'
              : 'Next'}
          </Text>
        </Pressable>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  metricValue: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  instructionCardFloorChange: {
    borderColor: colors.accent,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  floorChangeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    color: colors.textDark,
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  instructionType: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  instructionText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  instructionDistance: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  instructionFloor: {
    color: colors.accent,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  stepsList: {
    flex: 1,
    maxHeight: 200,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  stepItemActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepNumberActive: {
    backgroundColor: colors.primary,
    color: colors.text,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  stepTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  navControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  navBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  navBtnLabelPrimary: {
    color: colors.text,
  },
  speakBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  speakBtnLabel: {
    color: colors.textDark,
    fontWeight: '700',
    fontSize: 14,
  },
});
