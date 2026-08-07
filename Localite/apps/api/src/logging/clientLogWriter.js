import fs from 'fs';
import path from 'path';
import { formatLogRecord, serializeLogRecord } from '@localite/shared';
import { ensureLogDirectories, LOG_DIRS } from './paths.js';

function getClientLogPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIRS.frontend, `client-${date}.log`);
}

export function appendClientLogEntries(entries = []) {
  if (!entries.length) return { written: 0 };

  ensureLogDirectories();
  const lines = entries.map((entry) => serializeLogRecord(formatLogRecord({
    ...entry,
    service: entry.service || 'localite-mobile',
    source: entry.source || 'mobile',
  })));

  fs.appendFileSync(getClientLogPath(), lines.join(''), 'utf8');
  return { written: entries.length, file: getClientLogPath() };
}
