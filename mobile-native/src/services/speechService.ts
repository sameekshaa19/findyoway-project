import Tts from 'react-native-tts';

// Initialize TTS with defaults
Tts.setDefaultLanguage('en-US');
Tts.setDefaultRate(0.5);

export function speak(message: string) {
  console.log(`[Speech] ${message}`);
  Tts.stop();
  Tts.speak(message);
}
