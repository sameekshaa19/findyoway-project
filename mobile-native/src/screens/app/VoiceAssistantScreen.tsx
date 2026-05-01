import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { speak } from '../../services/speechService';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceAssistant'>;

export function VoiceAssistantScreen({ navigation }: Props) {
  const {
    voiceState,
    transcribedText,
    aiResponse,
    error,
    startListening,
    stopListening,
    isListening,
  } = useVoiceAssistant();

  // Speak AI response when it changes
  useEffect(() => {
    if (aiResponse) {
      speak(aiResponse);
    }
  }, [aiResponse]);

  // Handle mic button press
  const handleMicPress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  // Get status text based on voice state
  const getStatusText = () => {
    switch (voiceState) {
      case 'listening':
        return '🎤 Listening...';
      case 'processing':
        return '⚡ Processing...';
      default:
        return 'Tap microphone to speak';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (voiceState) {
      case 'listening':
        return colors.danger;
      case 'processing':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home" scrollable={false}>
      <AppHeader
        title="Voice Assistant"
        subtitle="Ask for navigation help using your voice"
      />

      <View style={styles.container}>
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {voiceState === 'processing' && (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          )}
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Transcription Display */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>You said</Text>
          <Text style={styles.transcriptionText}>
            {transcribedText || '...'}
          </Text>
        </View>

        {/* AI Response Display */}
        <ScrollView style={styles.responseScroll}>
          <View style={[styles.card, styles.aiResponseCard]}>
            <Text style={styles.cardLabel}>Assistant</Text>
            <Text style={styles.aiResponseText}>
              {aiResponse || 'Waiting for your question...'}
            </Text>
          </View>
        </ScrollView>

        {/* Mic Button */}
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
            ]}
            onPress={handleMicPress}
            activeOpacity={0.8}
          >
            <Text style={styles.micIcon}>{isListening ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
          
          <Text style={styles.micHint}>
            {isListening ? 'Tap to stop' : 'Tap to start'}
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginLeft: spacing.xs,
  },
  errorCard: {
    backgroundColor: colors.danger + '20',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aiResponseCard: {
    backgroundColor: colors.surfaceMuted,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  transcriptionText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  responseScroll: {
    flex: 1,
  },
  aiResponseText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  micContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  micIcon: {
    fontSize: 32,
  },
  micHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
