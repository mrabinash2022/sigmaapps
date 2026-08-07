import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let speechModulePromise;

export function isSpeechRecognitionSupported() {
  return !isExpoGo;
}

export async function getSpeechModule() {
  if (isExpoGo) return null;

  if (!speechModulePromise) {
    speechModulePromise = import('expo-speech-recognition').catch(() => null);
  }

  return speechModulePromise;
}

export async function checkSpeechRecognitionAvailable() {
  const mod = await getSpeechModule();
  if (!mod?.ExpoSpeechRecognitionModule) return false;
  try {
    return mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}
