const isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogData = unknown;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

const consoleWriters: Record<LogLevel, (entry: string) => void> = {
  error: (entry) => console.error(entry),
  warn: (entry) => console.warn(entry),
  info: (entry) => console.info(entry),
  debug: (entry) => console.log(entry),
};

function serializeData(data: unknown): unknown {
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack };
  }
  return data;
}

function logMessage(level: LogLevel, message: string, data?: LogData) {
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
  info: (message: string, data?: LogData) => logMessage('info', message, data),
  warn: (message: string, data?: LogData) => logMessage('warn', message, data),
  error: (message: string, data?: LogData) => logMessage('error', message, data),
  debug: (message: string, data?: LogData) => logMessage('debug', message, data),
};
