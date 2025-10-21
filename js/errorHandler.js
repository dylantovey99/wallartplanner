/**
 * Centralized error handling system
 * Provides user-friendly error messages and logging
 */

import { logger } from './logger.js';

export class ErrorHandler {
    /**
     * Handle an error with context
     * @param {Error|string} error Error object or message
     * @param {string} context Context where error occurred
     * @param {boolean} showUser Whether to show message to user
     */
    static handle(error, context = 'Unknown', showUser = true) {
        // Log the error
        logger.error(`Error in ${context}:`, error);

        // Show user-friendly message if requested
        if (showUser) {
            const message = this.getUserFriendlyMessage(error, context);
            this.showUserMessage(message, 'error');
        }

        // Log to monitoring service (if configured)
        this.logToService(error, context);
    }

    /**
     * Convert technical error to user-friendly message
     * @param {Error|string} error Error object or message
     * @param {string} context Error context
     * @returns {string} User-friendly message
     */
    static getUserFriendlyMessage(error, context) {
        const errorMessage = error?.message || String(error);

        // Map common errors to friendly messages
        if (error?.name === 'TypeError') {
            return 'An unexpected error occurred. Please refresh the page and try again.';
        }

        if (error?.name === 'NetworkError' || errorMessage.includes('fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }

        if (errorMessage.includes('localStorage') || errorMessage.includes('QuotaExceeded')) {
            return 'Unable to save data. Your browser storage may be full. Try clearing some data.';
        }

        if (errorMessage.includes('permission')) {
            return 'Permission denied. Please check your browser settings.';
        }

        if (context === 'FileUpload') {
            return 'Failed to upload image. Please ensure the file is a valid image (JPEG, PNG, GIF).';
        }

        if (context === 'PriceCalculation') {
            return 'Error calculating price. Please check your frame dimensions and try again.';
        }

        if (context === 'StateRestore') {
            return 'Could not restore your previous work. Starting fresh.';
        }

        // Generic fallback
        return 'Something went wrong. Please try again or refresh the page.';
    }

    /**
     * Display notification to user
     * @param {string} message Message to display
     * @param {string} type Message type: 'error', 'warning', 'success', 'info'
     * @param {number} duration Auto-close duration in ms (0 = manual close)
     */
    static showUserMessage(message, type = 'info', duration = 5000) {
        // Remove any existing notifications
        this.clearNotifications();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Set colors based on type
        const colors = {
            error: { bg: '#f44336', icon: '⚠' },
            warning: { bg: '#ff9800', icon: '⚠' },
            success: { bg: '#4caf50', icon: '✓' },
            info: { bg: '#2196f3', icon: 'ℹ' }
        };

        const color = colors[type] || colors.info;

        notification.innerHTML = `
            <span class="notification-icon">${color.icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: white;
            padding: 16px 24px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
        `;

        // Add to document
        document.body.appendChild(notification);

        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.closeNotification(notification);
        });

        // Auto-close if duration specified
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Close a notification with animation
     * @param {HTMLElement} notification Notification element
     */
    static closeNotification(notification) {
        if (!notification || !notification.parentNode) {
            return;
        }

        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Clear all notifications
     */
    static clearNotifications() {
        document.querySelectorAll('.notification').forEach(notification => {
            this.closeNotification(notification);
        });
    }

    /**
     * Log error to external monitoring service
     * @param {Error|string} error Error object or message
     * @param {string} context Error context
     */
    static logToService(error, context) {
        // Only send in production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return;
        }

        try {
            // Example integration with Sentry
            /*
            if (window.Sentry) {
                Sentry.captureException(error, {
                    tags: { context },
                    extra: {
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            */

            // Fire-and-forget logging
            const errorData = {
                message: error?.message || String(error),
                stack: error?.stack || '',
                context,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            // Uncomment when you have an error logging endpoint
            // navigator.sendBeacon('/api/log-error', JSON.stringify(errorData));
        } catch (e) {
            // Silently fail - logging errors shouldn't break the app
            logger.debug('Failed to send error to monitoring service:', e);
        }
    }

    /**
     * Wrap an async function with error handling
     * @param {Function} fn Async function to wrap
     * @param {string} context Context name
     * @returns {Function} Wrapped function
     */
    static wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }

    /**
     * Wrap a sync function with error handling
     * @param {Function} fn Function to wrap
     * @param {string} context Context name
     * @returns {Function} Wrapped function
     */
    static wrap(fn, context) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        };
    }

    /**
     * Show a success message to user
     * @param {string} message Success message
     * @param {number} duration Auto-close duration
     */
    static success(message, duration = 3000) {
        this.showUserMessage(message, 'success', duration);
    }

    /**
     * Show a warning message to user
     * @param {string} message Warning message
     * @param {number} duration Auto-close duration
     */
    static warning(message, duration = 4000) {
        this.showUserMessage(message, 'warning', duration);
    }

    /**
     * Show an info message to user
     * @param {string} message Info message
     * @param {number} duration Auto-close duration
     */
    static info(message, duration = 3000) {
        this.showUserMessage(message, 'info', duration);
    }
}

// Add CSS for notifications (inject into head)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 14px;
        line-height: 1.5;
    }

    .notification-icon {
        font-size: 20px;
        flex-shrink: 0;
    }

    .notification-message {
        flex: 1;
    }

    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s;
        flex-shrink: 0;
    }

    .notification-close:hover {
        opacity: 1;
    }

    .notification-close:focus {
        outline: 2px solid white;
        outline-offset: 2px;
    }

    @media (max-width: 768px) {
        .notification {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);

// Set up global error handler
window.addEventListener('error', (event) => {
    ErrorHandler.handle(event.error, 'Global', false);
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(event.reason, 'Promise', false);
});
