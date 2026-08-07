import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogLevel } from '@localite/shared';
import { loadEnv } from '../config/loadEnv.js';
import { ensureLogDirectories, LOG_DIRS } from './paths.js';

loadEnv();
ensureLogDirectories();

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? LogLevel.DEBUG : LogLevel.INFO);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${service || 'api'}] ${level}: ${message}${extra}`;
  }),
);

const transports = [
  new DailyRotateFile({
    dirname: LOG_DIRS.backend,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    zippedArchive: false,
    format: jsonFormat,
    level: logLevel,
  }),
  new DailyRotateFile({
    dirname: LOG_DIRS.backend,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    zippedArchive: false,
    format: jsonFormat,
    level: LogLevel.ERROR,
  }),
];

if (isDev || process.env.LOG_CONSOLE !== 'false') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel,
    }),
  );
}

const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'localite-api' },
  transports,
  exitOnError: false,
});

export function logHttp(message, meta = {}) {
  logger.log(LogLevel.HTTP, message, meta);
}

export function logError(message, error, meta = {}) {
  if (error instanceof Error) {
    logger.error(message, { ...meta, error: { name: error.name, message: error.message, stack: error.stack } });
    return;
  }
  logger.error(message, meta);
}

export default logger;
