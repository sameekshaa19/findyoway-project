import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { LoadingState } from '../../components/app/LoadingState';
import { ErrorState } from '../../components/app/ErrorState';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { fetchVenues, type VenueInfo } from '../../services/venueService';

type Props = NativeStackScreenProps<RootStackParamList, 'IndoorSelectVenue'>;

export function IndoorSelectVenueScreen({ navigation }: Props) {
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues()
      .then(setVenues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home">
      <AppHeader
        title="Select Venue"
        subtitle="Choose a building for indoor navigation"
      />

      {loading && <LoadingState message="Loading venues..." />}
      {error && <ErrorState message={error} />}

      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name} in ${item.city}${item.floors ? `, ${item.floors} floors` : ''}`}
            onPress={() =>
              navigation.navigate('IndoorMap', {
                venueId: item.id,
                venueName: item.name,
              })
            }
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.city}>{item.city}</Text>
            {item.floors != null && (
              <Text style={styles.floors}>
                {item.floors} floor{item.floors > 1 ? 's' : ''}
              </Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              No venues available. Ask an admin to register one on the dashboard.
            </Text>
          ) : null
        }
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  city: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  floors: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
