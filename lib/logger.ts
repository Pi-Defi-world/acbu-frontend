const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function logMessage(level: LogLevel, message: string, data?: unknown) {
  if (!isDebug) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined && { data })
  };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else if (level === 'info') {
    console.info(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

export const logger = {
  info: (message: string, data?: unknown) => logMessage('info', message, data),
  warn: (message: string, data?: unknown) => logMessage('warn', message, data),
  error: (message: string, data?: unknown) => logMessage('error', message, data),
  debug: (message: string, data?: unknown) => logMessage('debug', message, data),
};
