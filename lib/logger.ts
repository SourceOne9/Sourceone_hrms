// Safe import for Edge runtime compatibility
let ALS: any = null
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ALS = require('async_hooks').AsyncLocalStorage
} catch (e) {
    // async_hooks not available in Edge runtime (Next.js Middleware)
}

interface LogContextType {
    requestId: string
    organizationId?: string
    userId?: string
}

class MockAsyncLocalStorage<T> {
    getStore(): T | undefined { return undefined }
    run<R>(store: T, callback: () => R): R { return callback() }
}

export const logContext = ALS
    ? new (ALS as any)()
    : new MockAsyncLocalStorage<LogContextType>()

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

const currentLogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG

class Logger {
    private formatMessage(level: string, message: string, meta?: Record<string, unknown>) {
        const context = logContext.getStore()
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            requestId: context?.requestId,
            organizationId: context?.organizationId,
            userId: context?.userId,
            ...meta
        }
        return JSON.stringify(logEntry)
    }

    debug(message: string, meta?: Record<string, unknown>) {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, meta))
        }
    }

    info(message: string, meta?: Record<string, unknown>) {
        if (currentLogLevel <= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', message, meta))
        }
    }

    warn(message: string, meta?: Record<string, unknown>) {
        if (currentLogLevel <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message, meta))
        }
    }

    error(message: string, meta?: Record<string, unknown>) {
        if (currentLogLevel <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message, meta))
        }
    }
}

export const logger = new Logger()
