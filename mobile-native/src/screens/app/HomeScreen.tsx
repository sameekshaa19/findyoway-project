import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { VoiceCTAButton } from '../../components/app/VoiceCTAButton';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <AppHeader
        title="FindYoWay"
        subtitle="AI-powered navigation for the blind and visually impaired"
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Outdoor Navigation</Text>
        <Text style={styles.cardText}>
          Get walking directions to any destination with live GPS tracking, step-by-step voice guidance, and automatic rerouting.
        </Text>
        <AppButton label="Start Navigation" onPress={() => navigation.navigate('Destination')} />
      </View>

      <View style={styles.card} accessible accessibilityLabel="Indoor navigation using floor plans">
        <Text style={styles.cardTitle}>Indoor Navigation</Text>
        <Text style={styles.cardText}>
          Navigate inside venues with floor plans, A* pathfinding, and step-by-step voice guidance.
        </Text>
        <AppButton
          label="Start Indoor Navigation"
          onPress={() => navigation.navigate('IndoorSelectVenue')}
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assistive Tools</Text>
        <Text style={styles.cardText}>
          Use camera-based obstacle detection and voice assistant for navigation help.
        </Text>
        <AppButton
          label="Open Camera"
          onPress={() => navigation.navigate('CameraPlaceholder')}
          variant="secondary"
        />
        <AppButton
          label="Open Voice Assistant"
          onPress={() => navigation.navigate('VoiceAssistant')}
          variant="secondary"
        />
      </View>

      <VoiceCTAButton onPress={() => navigation.navigate('VoiceAssistant')} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
});
