// Platform detection for backend URL
import { Platform } from 'react-native';

const ANDROID_EMULATOR_LOCALHOST = 'http://10.0.2.2:5000';
const IOS_SIMULATOR_LOCALHOST = 'http://localhost:5000';
const DEFAULT_FALLBACK = 'http://localhost:5000';

// Override via environment variable or set this manually for physical devices
// e.g. export FLASK_API_URL=http://192.168.1.10:5000
export const FLASK_API_URL: string = (() => {
  if (Platform.OS === 'android') {
    return ANDROID_EMULATOR_LOCALHOST;
  }
  if (Platform.OS === 'ios') {
    return IOS_SIMULATOR_LOCALHOST;
  }
  return DEFAULT_FALLBACK;
})();
