import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/app/HomeScreen';
import { DestinationScreen } from '../screens/app/DestinationScreen';
import { RouteScreen } from '../screens/app/RouteScreen';
import { SOSScreen } from '../screens/app/SOSScreen';
import { SettingsScreen } from '../screens/app/SettingsScreen';
import { CameraScreen } from '../screens/app/CameraScreen';
import { VoiceAssistantScreen } from '../screens/app/VoiceAssistantScreen';
import { IndoorSelectVenueScreen } from '../screens/app/IndoorSelectVenueScreen';
import { IndoorMapScreen } from '../screens/app/IndoorMapScreen';
import { IndoorRouteViewScreen } from '../screens/app/IndoorRouteViewScreen';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Destination" component={DestinationScreen} />
        <Stack.Screen name="Route" component={RouteScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="CameraPlaceholder" component={CameraScreen} />
        <Stack.Screen
          name="VoiceAssistant"
          component={VoiceAssistantScreen}
        />
        <Stack.Screen name="IndoorSelectVenue" component={IndoorSelectVenueScreen} />
        <Stack.Screen name="IndoorMap" component={IndoorMapScreen} />
        <Stack.Screen name="IndoorRouteView" component={IndoorRouteViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
