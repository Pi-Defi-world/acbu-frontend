const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function logMessage(level: LogLevel, message: string, data?: unknown) {
  if (!isDebug) return;

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined && { data: serializeData(data) }),
  };

  consoleWriters[level](JSON.stringify(logEntry));
}

export const logger = {
  info: (message: string, data?: unknown) => logMessage('info', message, data),
  warn: (message: string, data?: unknown) => logMessage('warn', message, data),
  error: (message: string, data?: unknown) => logMessage('error', message, data),
  debug: (message: string, data?: unknown) => logMessage('debug', message, data),
};
