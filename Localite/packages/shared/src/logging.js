export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug',
};

const LEVEL_RANK = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

export function shouldLog(level, minLevel = LogLevel.INFO) {
  const current = LEVEL_RANK[level] ?? LEVEL_RANK.info;
  const min = LEVEL_RANK[minLevel] ?? LEVEL_RANK.info;
  return current <= min;
}

/** Normalize a log record for API / file output. */
export function formatLogRecord({
  level = LogLevel.INFO,
  message,
  service = 'localite',
  source,
  meta = {},
  error,
  timestamp = new Date().toISOString(),
}) {
  const record = {
    timestamp,
    level,
    service,
    message: String(message ?? ''),
  };

  if (source) record.source = source;
  if (meta && Object.keys(meta).length) record.meta = meta;

  if (error) {
    record.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return record;
}

export function serializeLogRecord(record) {
  return `${JSON.stringify(record)}\n`;
}
