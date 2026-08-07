import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LogLevel } from '@localite/shared';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';
const FLUSH_INTERVAL_MS = 4000;
const MAX_QUEUE = 40;

let queue = [];
let flushTimer = null;
let accessToken = null;

export function setLoggerAccessToken(token) {
  accessToken = token || null;
}

function consoleWrite(level, message, meta) {
  const prefix = `[localite-mobile:${level}]`;
  if (level === LogLevel.ERROR) {
    console.error(prefix, message, meta || '');
  } else if (level === LogLevel.WARN) {
    console.warn(prefix, message, meta || '');
  } else {
    console.log(prefix, message, meta || '');
  }
}

function enqueue(entry) {
  queue.push(entry);
  if (queue.length >= MAX_QUEUE) {
    flushClientLogs();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushClientLogs();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function flushClientLogs() {
  if (!queue.length) return;

  const batch = queue.splice(0, MAX_QUEUE);
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    await fetch(`${API_URL}/api/logs/client`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ logs: batch }),
    });
  } catch {
    // Keep console output as fallback; avoid recursive logging.
  }
}

function log(level, message, meta = {}, error) {
  const entry = {
    level,
    message: String(message),
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || '0.1.0',
    meta,
  };

  if (error) {
    entry.error = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: 'Error', message: String(error) };
  }

  consoleWrite(level, message, meta);
  enqueue(entry);
}

const logger = {
  debug: (message, meta) => log(LogLevel.DEBUG, message, meta),
  info: (message, meta) => log(LogLevel.INFO, message, meta),
  warn: (message, meta) => log(LogLevel.WARN, message, meta),
  error: (message, errorOrMeta, meta) => {
    if (errorOrMeta instanceof Error) {
      log(LogLevel.ERROR, message, meta || {}, errorOrMeta);
    } else {
      log(LogLevel.ERROR, message, errorOrMeta || {});
    }
  },
};

export default logger;
