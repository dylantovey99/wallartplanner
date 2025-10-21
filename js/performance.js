/**
 * Performance optimization utilities
 * Debouncing, throttling, and caching helpers
 */

/**
 * Debounce function calls - executes after delay of no activity
 * @param {Function} func Function to debounce
 * @param {number} delay Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;

    const debounced = function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };

    // Add cancel method
    debounced.cancel = () => {
        clearTimeout(timeoutId);
    };

    return debounced;
}

/**
 * Throttle function calls - executes at most once per delay period
 * @param {Function} func Function to throttle
 * @param {number} delay Minimum delay between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, delay) {
    let lastCall = 0;
    let timeoutId = null;

    const throttled = function(...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        if (timeSinceLastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        } else {
            // Schedule a call for the remaining time
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, delay - timeSinceLastCall);
        }
    };

    // Add cancel method
    throttled.cancel = () => {
        clearTimeout(timeoutId);
    };

    return throttled;
}

/**
 * Request idle callback with fallback
 * @param {Function} callback Function to call when idle
 * @param {Object} options Options for requestIdleCallback
 * @returns {number} Request ID
 */
export function requestIdleCallback(callback, options = {}) {
    if (typeof window.requestIdleCallback === 'function') {
        return window.requestIdleCallback(callback, options);
    }

    // Fallback to setTimeout
    return setTimeout(callback, 1);
}

/**
 * Cancel idle callback
 * @param {number} id Request ID
 */
export function cancelIdleCallback(id) {
    if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id);
    } else {
        clearTimeout(id);
    }
}

/**
 * Memoize function results
 * @param {Function} func Function to memoize
 * @param {Function} resolver Custom key resolver
 * @returns {Function} Memoized function
 */
export function memoize(func, resolver) {
    const cache = new Map();

    const memoized = function(...args) {
        const key = resolver ? resolver(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = func.apply(this, args);
        cache.set(key, result);
        return result;
    };

    // Add cache control methods
    memoized.cache = cache;
    memoized.clear = () => cache.clear();
    memoized.delete = (key) => cache.delete(key);

    return memoized;
}

/**
 * DOM query cache for repeated selectors
 */
export class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
    }

    /**
     * Get single element (querySelector)
     * @param {string} selector CSS selector
     * @param {Element} context Context element (default: document)
     * @returns {Element|null} Matching element
     */
    get(selector, context = document) {
        const key = this.getCacheKey(selector, context);

        if (!this.cache.has(key)) {
            const element = context.querySelector(selector);
            this.cache.set(key, element);
            this.watchElement(key, element);
        }

        return this.cache.get(key);
    }

    /**
     * Get multiple elements (querySelectorAll)
     * @param {string} selector CSS selector
     * @param {Element} context Context element (default: document)
     * @returns {NodeList} Matching elements
     */
    getAll(selector, context = document) {
        const key = this.getCacheKey(selector, context) + ':all';

        if (!this.cache.has(key)) {
            const elements = context.querySelectorAll(selector);
            this.cache.set(key, elements);
        }

        return this.cache.get(key);
    }

    /**
     * Generate cache key
     * @param {string} selector CSS selector
     * @param {Element} context Context element
     * @returns {string} Cache key
     */
    getCacheKey(selector, context) {
        return context === document ? selector : `${selector}@${context.id || 'ctx'}`;
    }

    /**
     * Watch element for removal from DOM
     * @param {string} key Cache key
     * @param {Element} element Element to watch
     */
    watchElement(key, element) {
        if (!element || !element.parentNode) {
            return;
        }

        // Use MutationObserver to detect when element is removed
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.removedNodes) {
                    if (node === element || node.contains(element)) {
                        this.invalidate(key);
                        observer.disconnect();
                        this.observers.delete(key);
                        break;
                    }
                }
            }
        });

        observer.observe(element.parentNode, { childList: true, subtree: true });
        this.observers.set(key, observer);
    }

    /**
     * Invalidate cache entry
     * @param {string} selector Selector to invalidate (or null for all)
     */
    invalidate(selector = null) {
        if (selector) {
            this.cache.delete(selector);
            const observer = this.observers.get(selector);
            if (observer) {
                observer.disconnect();
                this.observers.delete(selector);
            }
        } else {
            this.cache.clear();
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
        }
    }

    /**
     * Get cache size
     * @returns {number} Number of cached entries
     */
    size() {
        return this.cache.size;
    }
}

/**
 * Batch DOM updates using requestAnimationFrame
 */
export class BatchUpdater {
    constructor() {
        this.updates = [];
        this.scheduled = false;
    }

    /**
     * Schedule a DOM update
     * @param {Function} updateFn Update function
     */
    schedule(updateFn) {
        this.updates.push(updateFn);

        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    }

    /**
     * Execute all scheduled updates
     */
    flush() {
        const updates = this.updates.slice();
        this.updates = [];
        this.scheduled = false;

        updates.forEach(updateFn => {
            try {
                updateFn();
            } catch (error) {
                console.error('Error in batched update:', error);
            }
        });
    }

    /**
     * Clear all scheduled updates
     */
    clear() {
        this.updates = [];
        this.scheduled = false;
    }
}

/**
 * Lazy loader for heavy operations
 * @param {Function} loader Function that returns a promise
 * @returns {Function} Function that lazily loads and caches result
 */
export function lazy(loader) {
    let promise = null;
    let result = null;
    let error = null;

    return async function() {
        // Return cached result
        if (result !== null) {
            return result;
        }

        // Throw cached error
        if (error !== null) {
            throw error;
        }

        // Start loading if not already
        if (promise === null) {
            promise = loader().then(
                value => {
                    result = value;
                    return value;
                },
                err => {
                    error = err;
                    throw err;
                }
            );
        }

        return promise;
    };
}

/**
 * Create a singleton instance
 * @param {Function} constructor Constructor function
 * @returns {Function} Function that returns singleton instance
 */
export function singleton(constructor) {
    let instance = null;

    return function(...args) {
        if (instance === null) {
            instance = new constructor(...args);
        }
        return instance;
    };
}

/**
 * Measure function execution time
 * @param {Function} func Function to measure
 * @param {string} label Label for logging
 * @returns {Function} Wrapped function that logs execution time
 */
export function measurePerformance(func, label) {
    return function(...args) {
        const start = performance.now();
        const result = func.apply(this, args);
        const duration = performance.now() - start;

        console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);

        return result;
    };
}

/**
 * Async version of measurePerformance
 * @param {Function} func Async function to measure
 * @param {string} label Label for logging
 * @returns {Function} Wrapped async function
 */
export function measurePerformanceAsync(func, label) {
    return async function(...args) {
        const start = performance.now();
        const result = await func.apply(this, args);
        const duration = performance.now() - start;

        console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);

        return result;
    };
}

// Create singleton instances for common use cases
export const domCache = new DOMCache();
export const batchUpdater = new BatchUpdater();
