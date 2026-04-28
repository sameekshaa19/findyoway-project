import React, { useState } from 'react';
import { StyleSheet, Text, View, Linking, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../components/app/AppButton';
import { AppHeader } from '../../components/app/AppHeader';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { speak } from '../../services/speechService';

type Props = NativeStackScreenProps<RootStackParamList, 'SOS'>;

// ⚠️ Put your emergency contact number here (with country code)
const EMERGENCY_CONTACT = '+918073930483';

export function SOSScreen({ navigation }: Props) {
  const { location } = useLocationTracking();
  const [sending, setSending] = useState(false);

  const coordinates = location
    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
    : 'Location unavailable';

  const mapsLink = location
    ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
    : 'Location not available';

  const emergencyMessage = `🆘 EMERGENCY ALERT 🆘\nI need help! My current location:\n📍 Coordinates: ${coordinates}\n🗺️ Google Maps: ${mapsLink}\nPlease help me immediately!`;

  const sendWhatsApp = async () => {
    setSending(true);
    speak('Sending emergency alert via WhatsApp');

    const encodedMessage = encodeURIComponent(emergencyMessage);
    const whatsappUrl = `whatsapp://send?phone=${EMERGENCY_CONTACT}&text=${encodedMessage}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // WhatsApp not installed — fallback to SMS
        sendSMS();
      }
    } catch (error) {
      sendSMS();
    }

    setSending(false);
  };

  const sendSMS = () => {
    speak('Opening SMS for emergency alert');
    const encodedMessage = encodeURIComponent(emergencyMessage);
    const smsUrl = `sms:${EMERGENCY_CONTACT}?body=${encodedMessage}`;
    Linking.openURL(smsUrl).catch(() => {
      Alert.alert(
        'Error',
        'Could not open WhatsApp or SMS. Please call emergency services directly.'
      );
    });
  };

  const announceLocation = () => {
    speak(`Emergency mode enabled. Current coordinates ${coordinates}.`);
  };

  return (
    <ScreenLayout navigation={navigation} currentRoute="SOS">
      <AppHeader
        title="🆘 SOS Emergency"
        subtitle="Send your location to emergency contacts instantly."
      />

      <View style={styles.card}>
        <Text style={styles.copy}>Your current location</Text>
        <Text style={styles.coordinates}>{coordinates}</Text>

        {location && (
          <Text style={styles.mapsLink}>📍 {mapsLink}</Text>
        )}
      </View>

      <View style={styles.buttonGroup}>
        <AppButton
          label={sending ? 'Sending...' : '📱 Send WhatsApp SOS'}
          onPress={sendWhatsApp}
          variant="danger"
        />

        <AppButton
          label="💬 Send SMS SOS"
          onPress={sendSMS}
          variant="danger"
        />

        <AppButton
          label="🔊 Announce Location"
          onPress={announceLocation}
          variant="danger"
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  buttonGroup: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    color: colors.textMuted,
  },
  coordinates: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  mapsLink: {
    color: '#3b82f6',
    fontSize: 12,
  },
});