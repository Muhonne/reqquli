// MORGAN: Structured logging configuration with Winston
import winston from 'winston';
import path from 'path';

// Define log levels with priorities
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

// Custom log colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(logColors);

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${
      info.stack ? '\n' + info.stack : ''
    }`
  )
);

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Winston logger configuration
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: {
    service: 'quire-server',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console logging for development
    ...(isDevelopment ? [
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
      })
    ] : []),

    // File logging for all environments
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),

    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Production console logging (less verbose)
    ...(isProduction ? [
      new winston.transports.Console({
        level: 'warn',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.simple()
        )
      })
    ] : []),
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    ...(isDevelopment ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : []),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    ...(isDevelopment ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : []),
  ],
  exitOnError: false // Don't exit on handled exceptions
});

// Add HTTP request logging middleware integration
export const httpLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf((info) => {
    return `${info.timestamp} [${info.level}] HTTP ${info.method} ${info.url} ${info.status} - ${info.responseTime}ms - ${info.ip}`;
  })
);

// Utility functions for common logging patterns
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

export const logHTTP = (method: string, url: string, status: number, responseTime: number, ip: string) => {
  logger.http('HTTP Request', {
    method,
    url,
    status,
    responseTime,
    ip
  });
};

export const logAuth = (action: string, userId?: string, ip?: string, success?: boolean) => {
  logger.info('Authentication Event', {
    action,
    userId,
    ip,
    success,
    timestamp: new Date().toISOString()
  });
};

export const logSecurity = (event: string, ip: string | undefined, details?: Record<string, any>) => {
  logger.warn('Security Event', {
    event,
    ip: ip || 'unknown',
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logDatabase = (operation: string, table?: string, error?: Error) => {
  if (error) {
    logger.error('Database Error', {
      operation,
      table,
      error: error.message,
      stack: error.stack
    });
  } else {
    logger.debug('Database Operation', {
      operation,
      table
    });
  }
};

// Create logs directory on module load
import fs from 'fs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export default logger;