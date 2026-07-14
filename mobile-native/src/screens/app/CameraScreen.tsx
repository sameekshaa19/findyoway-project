import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader } from '../../components/app/AppHeader';
import { colors, radii, spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from './ScreenLayout';
import { speak } from '../../services/speechService';
import { FLASK_API_URL } from '../../config';

type Props = NativeStackScreenProps<RootStackParamList, 'CameraPlaceholder'>;

interface DetectedObject {
  name: string;
  score: number;
  distance: string;
  isDangerous: boolean;
  bbox: [number, number, number, number];
}

async function fileToBase64(path: string): Promise<string> {
  const response = await fetch(`file://${path}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function detectObjects(frameBase64: string): Promise<{ objects: DetectedObject[]; error?: string }> {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frameBase64 }),
    });
    if (!response.ok) return { objects: [], error: `Server error (${response.status})` };
    const data = await response.json();
    return { objects: data.objects || [] };
  } catch (e) {
    return { objects: [], error: 'Network error — check connection to backend' };
  }
}

const SPOKEN_DANGER_COOLDOWN = 5000;

export function CameraScreen({ navigation }: Props) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertRef = useRef(0);
  const isActiveRef = useRef(true);

  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionDenied(true);
          return;
        }
      }
      if (!hasPermission) {
        const result = await requestPermission();
        if (!result) {
          setPermissionDenied(true);
          return;
        }
      }
    })();
  }, [hasPermission, requestPermission]);

  const captureAndDetect = useCallback(async () => {
    if (!cameraRef.current || isDetecting) return;
    setIsDetecting(true);
    setNetworkError(null);

    try {
      const snapshot = await cameraRef.current.takeSnapshot({
        quality: 70,
      });
      const base64 = await fileToBase64(snapshot.path);
      const { objects: detected, error: detectError } = await detectObjects(base64);

      if (detectError) {
        setNetworkError(detectError);
      }

      setObjects(detected);

      const dangerous = detected.filter((o) => o.isDangerous);
      if (dangerous.length > 0) {
        const now = Date.now();
        if (now - lastAlertRef.current > SPOKEN_DANGER_COOLDOWN) {
          lastAlertRef.current = now;
          const alerts = dangerous
            .slice(0, 2)
            .map((o) => `${o.name} ${o.distance}`)
            .join(', ');
          speak(`Caution: ${alerts}`);
        }
      }
    } catch (e) {
      setNetworkError('Capture failed');
    } finally {
      setIsDetecting(false);
    }
  }, [isDetecting]);

  useEffect(() => {
    if (!device || permissionDenied) return;
    const timer = setInterval(captureAndDetect, 3000);
    timerRef.current = timer;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [device, permissionDenied, captureAndDetect]);

  if (permissionDenied) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Home">
        <AppHeader title="Camera" subtitle="Permission required" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionText}>
            Grant camera permission in settings to enable obstacle detection.
          </Text>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => {
              if (Platform.OS === 'android') {
                PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.CAMERA,
                ).then((r) => setPermissionDenied(r !== PermissionsAndroid.RESULTS.GRANTED));
              }
            }}
          >
            <Text style={styles.settingsBtnLabel}>Retry Permission</Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  if (!device) {
    return (
      <ScreenLayout navigation={navigation} currentRoute="Home">
        <AppHeader title="Camera" subtitle="No camera available" />
        <View style={styles.permissionCard}>
          <Text style={styles.permissionText}>
            No rear camera found on this device.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} currentRoute="Home" scrollable={false}>
      <AppHeader
        title="Obstacle Detection"
        subtitle="Camera scans surroundings every 3 seconds"
      />

      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={false}
        />

        {/* Detection overlay */}
        {objects.length > 0 && (
          <View style={styles.overlay}>
            {objects.map((obj, i) => (
              <View
                key={i}
                style={[
                  styles.objTag,
                  obj.isDangerous && styles.objTagDanger,
                ]}
              >
                <Text
                  style={[
                    styles.objTagText,
                    obj.isDangerous && styles.objTagTextDanger,
                  ]}
                >
                  {obj.name} ({obj.distance})
                </Text>
              </View>
            ))}
          </View>
        )}

        {isDetecting && (
          <View style={styles.detectingOverlay}>
            <Text style={styles.detectingText}>Scanning...</Text>
          </View>
        )}
      </View>

      {networkError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{networkError}</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          {objects.length > 0
            ? `${objects.length} object(s) detected`
            : 'No objects detected'}
        </Text>
        {objects.filter((o) => o.isDangerous).length > 0 && (
          <Text style={styles.dangerText}>
            {objects.filter((o) => o.isDangerous).length} obstacle(s) ahead
            — voice alert active
          </Text>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: colors.danger + '20',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  permissionText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  settingsBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  settingsBtnLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    minHeight: 300,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  objTag: {
    backgroundColor: colors.surface + 'DD',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  objTagDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.danger + 'CC',
  },
  objTagText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  objTagTextDanger: {
    color: colors.text,
  },
  detectingOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary + 'AA',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  detectingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  infoTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  dangerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
