import Tts from 'react-native-tts';

// Initialize TTS engine with settings
let isInitialized = false;

const initTTS = async () => {
  if (isInitialized) return;

  try {
    // Set default configuration
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);

    // Get available voices (optional - for debugging)
    const voices = await Tts.voices();
    console.log('[TTS] Available voices:', voices.length);

    isInitialized = true;
  } catch (error) {
    console.error('[TTS] Initialization error:', error);
  }
};

// Initialize on module load
initTTS();

/**
 * Speak text aloud using TTS
 * Stops any current speech before starting new
 */
export async function speak(message: string) {
  // Validate input
  if (!message || message.trim() === '') {
    console.log('[TTS] Empty message, skipping');
    return;
  }

  // Ensure TTS is initialized
  if (!isInitialized) {
    await initTTS();
  }

  try {
    // Stop any current speech
    await Tts.stop();

    // Speak the message
    await Tts.speak(message);
    console.log(`[TTS] Speaking: ${message.substring(0, 50)}...`);
  } catch (error) {
    console.error('[TTS] Speak error:', error);
  }
}

/**
 * Stop current TTS playback
 */
export async function stopSpeaking() {
  try {
    await Tts.stop();
    console.log('[TTS] Stopped');
  } catch (error) {
    console.error('[TTS] Stop error:', error);
  }
}

// Handle TTS events
Tts.addEventListener('tts-start', (event: { utteranceId: string }) => {
  console.log('[TTS] Started:', event);
});

Tts.addEventListener('tts-finish', (event: { utteranceId: string }) => {
  console.log('[TTS] Finished:', event);
});

Tts.addEventListener('tts-cancel', (event: { utteranceId: string }) => {
  console.log('[TTS] Cancelled:', event);
});

Tts.addEventListener('tts-error', (event: { code: string; message: string }) => {
  console.error('[TTS] Error:', event);
});
