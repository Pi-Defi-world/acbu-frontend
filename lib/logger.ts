const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function logMessage(level: LogLevel, message: string, data?: any) {
  if (!isDebug && level !== 'error') return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined && { data })
  };

  // In debug mode, or for errors, output structured logs to console
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
  info: (message: string, data?: any) => logMessage('info', message, data),
  warn: (message: string, data?: any) => logMessage('warn', message, data),
  error: (message: string, data?: any) => logMessage('error', message, data),
  debug: (message: string, data?: any) => logMessage('debug', message, data),
};
