import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceAssistantPlaceholder'>;

const FLASK_URL = 'http://192.168.1.10:5000';

export function VoiceAssistantPlaceholderScreen({ navigation }: Props) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch(`${FLASK_URL}/api/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, language: 'en' }),
      });

      const data = await res.json();
      setResponse(data.response || data.reply || data.message || JSON.stringify(data));
    } catch (e) {
      setError('Cannot connect to backend. Make sure Flask is running.');
    }

    setLoading(false);
  };

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <ScrollView>
        <AppHeader
          title="Voice Assistant"
          subtitle="Type your question and get AI guidance"
        />

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Ask something e.g. Where is the pharmacy?"
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendMessage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Thinking...' : '🎙️ Ask Assistant'}
            </Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {response ? (
            <View style={styles.responseBox}>
              <Text style={styles.responseLabel}>Assistant:</Text>
              <Text style={styles.responseText}>{response}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fee2e2',
    borderRadius: radii.md,
  },
  errorText: {
    color: '#dc2626',
  },
  responseBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#f0fdf4',
    borderRadius: radii.md,
  },
  responseLabel: {
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 6,
  },
  responseText: {
    color: colors.text,
    lineHeight: 22,
  },
});