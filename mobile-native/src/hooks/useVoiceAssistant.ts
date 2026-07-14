import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Voice from 'react-native-voice';
import { FLASK_API_URL } from '../config';

export type VoiceState = 'idle' | 'listening' | 'processing';

interface UseVoiceAssistantReturn {
  voiceState: VoiceState;
  transcribedText: string;
  aiResponse: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  isListening: boolean;
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Handle speech recognition results
  const onSpeechResults = useCallback((e: { value: string[] }) => {
    const text = e.value[0] || '';
    setTranscribedText(text);
  }, []);

  // Handle speech recognition errors
  const onSpeechError = useCallback((e: { error?: { message?: string } }) => {
    const errorMessage = e.error?.message || 'Speech recognition error';
    
    if (errorMessage.includes('no match') || errorMessage.includes('No speech')) {
      setError('No speech detected. Please try again.');
    } else if (errorMessage.includes('permission')) {
      setError('Microphone permission denied.');
    } else {
      setError(errorMessage);
    }
    
    setVoiceState('idle');
    setIsListening(false);
  }, []);

  // Initialize voice listeners
  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onSpeechResults, onSpeechError]);

  // Send transcribed text to backend and get AI response
  const sendToBackend = useCallback(async (text: string) => {
    try {
      setVoiceState('processing');
      
      const response = await fetch(`${FLASK_API_URL}/api/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          language: 'English',
          context: '',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.reply || data.response || 'No response received';
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to connect to server');
    }
  }, []);

  // Request microphone permissions on Android
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'FindYoWay needs access to your microphone for voice navigation.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // Start listening
  const startListening = async () => {
    try {
      setError(null);
      setTranscribedText('');
      setAiResponse('');

      // Check permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError('Microphone permission denied. Please enable it in settings.');
        return;
      }

      setVoiceState('listening');
      setIsListening(true);

      await Voice.start('en-US');
    } catch (err) {
      setError('Failed to start voice recognition');
      setVoiceState('idle');
      setIsListening(false);
    }
  };

  // Stop listening and process
  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);

      // Process the transcribed text if we have any
      if (transcribedText.trim()) {
        const response = await sendToBackend(transcribedText);
        setAiResponse(response);
        setVoiceState('idle');
      } else {
        setError('No speech detected. Please try again.');
        setVoiceState('idle');
      }
    } catch (err) {
      setError('Failed to process voice input');
      setVoiceState('idle');
    }
  };

  return {
    voiceState,
    transcribedText,
    aiResponse,
    error,
    startListening,
    stopListening,
    isListening,
  };
}
