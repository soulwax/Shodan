// File: src/utils/logger.ts


import winston from 'winston'

// Custom format for colored console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    return `[${info.timestamp}] ${info.level.padEnd(7)}: ${info.message}`
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'shodan-bot' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
})

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  )
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }))
}