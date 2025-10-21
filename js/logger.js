/**
 * Centralized logging system
 * Controls log output based on environment and level
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        // Set logging level based on environment
        this.level = this.getLogLevel();
        this.contextPrefix = '';
    }

    /**
     * Determine log level from URL parameters or environment
     * @returns {number} Log level constant
     */
    getLogLevel() {
        // Check for debug parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            return LOG_LEVELS.DEBUG;
        }

        // Check for development indicators
        const isDevelopment = window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1' ||
                             window.location.port !== '';

        // In production, only show errors
        // In development, show everything
        return isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
    }

    /**
     * Set context prefix for all logs
     * @param {string} prefix Context prefix
     */
    setContext(prefix) {
        this.contextPrefix = prefix;
    }

    /**
     * Clear context prefix
     */
    clearContext() {
        this.contextPrefix = '';
    }

    /**
     * Format log message with context
     * @param {Array} args Log arguments
     * @returns {Array} Formatted arguments
     */
    formatMessage(args) {
        if (this.contextPrefix) {
            return [`[${this.contextPrefix}]`, ...args];
        }
        return args;
    }

    /**
     * Debug level logging
     * @param {...any} args Arguments to log
     */
    debug(...args) {
        if (this.level <= LOG_LEVELS.DEBUG) {
            console.log('[DEBUG]', ...this.formatMessage(args));
        }
    }

    /**
     * Info level logging
     * @param {...any} args Arguments to log
     */
    info(...args) {
        if (this.level <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...this.formatMessage(args));
        }
    }

    /**
     * Warning level logging
     * @param {...any} args Arguments to log
     */
    warn(...args) {
        if (this.level <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...this.formatMessage(args));
        }
    }

    /**
     * Error level logging
     * @param {...any} args Arguments to log
     */
    error(...args) {
        if (this.level <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...this.formatMessage(args));
            // Send to error tracking service
            this.sendToErrorService(args);
        }
    }

    /**
     * Log performance metrics
     * @param {string} label Metric label
     * @param {number} duration Duration in milliseconds
     */
    performance(label, duration) {
        if (this.level <= LOG_LEVELS.DEBUG) {
            console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Start a performance timer
     * @param {string} label Timer label
     * @returns {Function} Function to end timer and log duration
     */
    startTimer(label) {
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.performance(label, duration);
            return duration;
        };
    }

    /**
     * Send error data to monitoring service
     * @param {Array} errorData Error information
     */
    sendToErrorService(errorData) {
        // Only send in production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return;
        }

        try {
            // Example: Send to error tracking service
            // You can integrate with Sentry, LogRocket, etc.
            /*
            if (window.Sentry) {
                Sentry.captureException(new Error(errorData.join(' ')));
            }
            */

            // For now, use sendBeacon for fire-and-forget logging
            const errorPayload = {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                error: errorData.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
            };

            // Uncomment when you have an error logging endpoint
            // navigator.sendBeacon('/api/log-error', JSON.stringify(errorPayload));
        } catch (e) {
            // Silently fail - don't want logging to break the app
            console.error('Failed to send error to monitoring service:', e);
        }
    }

    /**
     * Create a child logger with a specific context
     * @param {string} context Context name
     * @returns {Logger} New logger instance
     */
    child(context) {
        const childLogger = new Logger();
        childLogger.level = this.level;
        childLogger.setContext(context);
        return childLogger;
    }
}

// Create and export singleton instance
export const logger = new Logger();

// Export LOG_LEVELS for external use
export { LOG_LEVELS };
