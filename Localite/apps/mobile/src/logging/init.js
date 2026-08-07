import logger, { flushClientLogs } from './logger';

export function setupClientLogging() {
  const originalHandler = global.ErrorUtils?.getGlobalHandler?.();

  if (global.ErrorUtils?.setGlobalHandler) {
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      logger.error(isFatal ? 'Fatal JS error' : 'Unhandled JS error', error, { isFatal });
      flushClientLogs();
      originalHandler?.(error, isFatal);
    });
  }

  logger.info('Mobile logging initialized');
}

export { flushClientLogs };
export default logger;
