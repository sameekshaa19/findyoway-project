import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Vibration } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { detectObjects, readSigns } from '../../services/visionService';
import { speak } from '../../services/speechService';
import { AppButton } from '../../components/app/AppButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);

  const modeRef = useRef<'obstacle' | 'sign'>('obstacle');
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const cameraReadyRef = useRef(false);

  const [mode, setMode] = useState<'obstacle' | 'sign'>('obstacle');
  const [lastDetected, setLastDetected] = useState<string>('Starting...');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runDetection = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (!cameraRef.current) return;
    if (!cameraReadyRef.current) return;

    if (typeof cameraRef.current.takePhoto !== 'function') {
      console.warn('takePhoto not available yet');
      return;
    }

    isProcessingRef.current = true;

    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });

      if (!isMountedRef.current) return;

      if (modeRef.current === 'obstacle') {
        const result = await detectObjects(photo.path);

        if (!isMountedRef.current) return;

        if (result.objects && result.objects.length > 0) {
          const dangerous = result.objects.find((o: any) => o.isDangerous);
          if (dangerous) {
            setLastDetected(`${dangerous.name} — ${dangerous.distance}`);
            if (dangerous.distance === 'very close') {
              Vibration.vibrate([0, 500, 200, 500]);
              speak(`Caution! ${dangerous.name} very close.`);
            } else {
              speak(`${dangerous.name} detected, ${dangerous.distance}.`);
            }
          } else {
            const first = result.objects[0];
            setLastDetected(`${first.name} — ${first.distance}`);
            speak(`${first.name} detected.`);
          }
        } else {
          setLastDetected('No objects detected');
        }
      } else {
        const result = await readSigns(photo.path);

        if (!isMountedRef.current) return;

        const guidance = result.guidance || result.reply;
        if (guidance) {
          setLastDetected(`Sign: ${guidance}`);
          speak(guidance);
        } else {
          setLastDetected('No signs detected.');
        }
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        console.error('Detection error:', error?.message || error);
        setLastDetected('Scanning...');
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasPermission || !device) return;

    const intervalId = setInterval(() => {
      runDetection();
    }, 2000);

    const fallback = setTimeout(() => {
      if (isMountedRef.current && !cameraReadyRef.current) {
        cameraReadyRef.current = true;
        setLastDetected('Scanning...');
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(fallback);
    };
  }, [hasPermission, device, runDetection]);

  if (!hasPermission) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Camera">
        <View style={styles.centerContainer}>
          <Text style={styles.text}>Requesting Camera Permission...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (device == null) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Camera">
        <View style={styles.centerContainer}>
          <Text style={styles.text}>No Camera Device Found.</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} currentRoute="Camera">
      <AppHeader
        title={mode === 'obstacle' ? 'Obstacle Detection' : 'Sign Reading'}
        subtitle="Live camera feed with AI analysis."
      />

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
          onInitialized={() => {
            cameraReadyRef.current = true;
            setLastDetected('Scanning...');
          }}
          onError={(error) => {
            console.error('Camera hardware error:', error);
            setLastDetected('Camera error. Please restart.');
          }}
        />

        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{lastDetected}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <AppButton
          label={mode === 'obstacle' ? 'Switch to Sign Reading' : 'Switch to Obstacle Detection'}
          onPress={() => setMode(prev => (prev === 'obstacle' ? 'sign' : 'obstacle'))}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  text: {
    color: colors.text,
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginVertical: spacing.md,
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  overlayText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  controls: {
    paddingBottom: spacing.lg,
  },
});
