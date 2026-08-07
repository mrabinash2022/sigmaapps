import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  checkSpeechRecognitionAvailable,
  getSpeechModule,
  isSpeechRecognitionSupported,
} from '../services/speechRecognition';

function appendTranscript(existing, spoken) {
  const chunk = spoken.trim();
  if (!chunk) return existing;
  if (!existing?.trim()) return chunk;
  return `${existing.trim()}\n${chunk}`;
}

export function useSpeechToText({ onAppend, lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(false);
  const pendingRef = useRef('');
  const onAppendRef = useRef(onAppend);

  useEffect(() => {
    onAppendRef.current = onAppend;
  }, [onAppend]);

  useEffect(() => {
    let mounted = true;
    const subscriptions = [];

    (async () => {
      if (!isSpeechRecognitionSupported()) {
        if (mounted) setAvailable(false);
        return;
      }

      const mod = await getSpeechModule();
      if (!mounted || !mod?.ExpoSpeechRecognitionModule) return;

      const isAvailable = await checkSpeechRecognitionAvailable();
      if (!mounted) return;
      setAvailable(isAvailable);
      if (!isAvailable) return;

      const { ExpoSpeechRecognitionModule } = mod;

      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('start', () => {
          pendingRef.current = '';
          setListening(true);
        }),
        ExpoSpeechRecognitionModule.addListener('end', () => {
          setListening(false);
          const chunk = pendingRef.current.trim();
          if (chunk) {
            onAppendRef.current?.(chunk);
          }
          pendingRef.current = '';
        }),
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const transcript = event.results?.[0]?.transcript?.trim();
          if (!transcript) return;

          if (event.isFinal) {
            pendingRef.current = pendingRef.current
              ? `${pendingRef.current} ${transcript}`
              : transcript;
          }
        }),
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          setListening(false);
          pendingRef.current = '';
          if (event.error === 'aborted' || event.error === 'no-speech') return;
          Alert.alert('Voice input', event.message || 'Could not recognize speech. Try again.');
        }),
      );
    })();

    return () => {
      mounted = false;
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  const stopListening = useCallback(async () => {
    const mod = await getSpeechModule();
    mod?.ExpoSpeechRecognitionModule?.stop();
  }, []);

  const startListening = useCallback(async () => {
    const mod = await getSpeechModule();
    if (!mod?.ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Voice input unavailable',
        'Voice ordering needs a development build of the app. For now, type your list or upload a photo.',
      );
      return false;
    }

    const { ExpoSpeechRecognitionModule } = mod;

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      Alert.alert(
        'Microphone permission needed',
        'Allow microphone and speech recognition access to speak your order list.',
      );
      return false;
    }

    pendingRef.current = '';
    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
    return true;
  }, [lang]);

  const toggleListening = useCallback(async () => {
    if (listening) {
      await stopListening();
      return;
    }
    await startListening();
  }, [listening, startListening, stopListening]);

  return {
    listening,
    available: isSpeechRecognitionSupported() && available,
    toggleListening,
    stopListening,
  };
}

export { appendTranscript };
