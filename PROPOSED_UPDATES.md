# Proposed Updates for Wall Art Planner

This document outlines specific, actionable updates to improve the Wall Art Planner project.

## Immediate Actions (Critical - Week 1)

### 1. Fix Session Security (functions.php)

**Current Code (Lines 2-26):**
```php
session_start(); // PROBLEM: Duplicate call
add_action('init', 'register_my_session');
function register_my_session() {
    if (!session_id()) {
        session_start(); // PROBLEM: Already called above
    }
}
```

**Updated Code:**
```php
<?php
// Remove global session_start()
add_action('init', 'register_my_session');

function register_my_session() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set secure session parameters
        ini_set('session.cookie_httponly', 1);
        ini_set('session.cookie_secure', 1); // HTTPS only
        ini_set('session.cookie_samesite', 'Strict');
        ini_set('session.use_strict_mode', 1);
        ini_set('session.gc_maxlifetime', 3600);
        session_set_cookie_params([
            'lifetime' => 3600,
            'path' => '/',
            'domain' => $_SERVER['HTTP_HOST'],
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        session_start();
    }
}
```

### 2. Replace Insecure Encoding (functions.php)

**Current Code (Lines 54-65):**
```php
function encodeAndChunkData($data, $chunkSize = 100) {
    $encodedData = base64_encode($data); // NOT SECURE
    return str_split($encodedData, $chunkSize);
}

function decodeChunks($chunks) {
    $encodedData = implode('', $chunks);
    return base64_decode($encodedData);
}
```

**Updated Code:**
```php
// Define encryption key (store in wp-config.php)
define('WALL_ART_ENCRYPTION_KEY', 'your-secret-key-here'); // Generate using: bin2hex(random_bytes(32))

function encryptData($data) {
    $cipher = 'aes-256-gcm';
    $key = WALL_ART_ENCRYPTION_KEY;
    $ivLength = openssl_cipher_iv_length($cipher);
    $iv = openssl_random_pseudo_bytes($ivLength);
    $tag = '';

    $encrypted = openssl_encrypt(
        $data,
        $cipher,
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    if ($encrypted === false) {
        error_log('Encryption failed');
        return false;
    }

    // Combine IV + tag + encrypted data
    return base64_encode($iv . $tag . $encrypted);
}

function decryptData($encrypted) {
    $cipher = 'aes-256-gcm';
    $key = WALL_ART_ENCRYPTION_KEY;
    $ivLength = openssl_cipher_iv_length($cipher);
    $tagLength = 16;

    $decoded = base64_decode($encrypted);
    if ($decoded === false) {
        error_log('Base64 decode failed');
        return false;
    }

    $iv = substr($decoded, 0, $ivLength);
    $tag = substr($decoded, $ivLength, $tagLength);
    $ciphertext = substr($decoded, $ivLength + $tagLength);

    $decrypted = openssl_decrypt(
        $ciphertext,
        $cipher,
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    if ($decrypted === false) {
        error_log('Decryption failed');
        return false;
    }

    return $decrypted;
}
```

### 3. Create Centralized Logger (js/logger.js)

**New File:**
```javascript
// js/logger.js

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        // Set to ERROR for production, DEBUG for development
        this.level = this.getLogLevel();
    }

    getLogLevel() {
        // Check for environment variable or default to ERROR
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true') {
            return LOG_LEVELS.DEBUG;
        }
        // In production, this should be NONE or ERROR
        return LOG_LEVELS.ERROR;
    }

    debug(...args) {
        if (this.level <= LOG_LEVELS.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    }

    info(...args) {
        if (this.level <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    }

    warn(...args) {
        if (this.level <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    }

    error(...args) {
        if (this.level <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
            // Send to error tracking service
            this.sendToErrorService(args);
        }
    }

    sendToErrorService(errorData) {
        // Implement error tracking (e.g., Sentry, LogRocket)
        // For now, just log
        if (window.location.hostname !== 'localhost') {
            // navigator.sendBeacon('/error-log', JSON.stringify(errorData));
        }
    }
}

export const logger = new Logger();
```

**Usage in other files:**
```javascript
// Replace console.log with logger
import { logger } from './logger.js';

// Before:
console.log('Frame created', frame);

// After:
logger.debug('Frame created', frame);
```

### 4. Extract Constants (js/constants.js)

**New File:**
```javascript
// js/constants.js

// Display
export const SCALE = 10; // Pixels per inch

// Pricing
export const PRICE_MARKUP = 1.049;
export const TAX_RATE = 1.06;
export const ADDITIONAL_MARKUP = 1.09;
export const FRAME_INCREMENT = 1.071;
export const PRINT_MARKUP = 1.049;
export const FRAME_20MM_MARKUP = 1.12;
export const BASE_FEE = 0.60;
export const ADDITIONAL_FEE = 0.20;

// Dimensions
export const DEFAULT_WALL = {
    width: 80, // inches
    height: 80, // inches
    color: '#f0f0f0'
};

export const WALL_LIMITS = {
    MIN_WIDTH: 24,
    MAX_WIDTH: 600,
    MIN_HEIGHT: 24,
    MAX_HEIGHT: 600
};

// Frame
export const FRAME_WIDTHS = {
    MM_20: 20,
    MM_30: 30,
    MM_40: 40
};

export const FRAME_MATERIALS = {
    BLACK: 'black',
    WHITE: 'white',
    OAK: 'oak',
    WALNUT: 'walnut'
};

export const FRAME_COLORS = {
    [FRAME_MATERIALS.BLACK]: '#111111',
    [FRAME_MATERIALS.WHITE]: '#FAFAFA',
    [FRAME_MATERIALS.OAK]: '#D2B48C',
    [FRAME_MATERIALS.WALNUT]: '#7B3F00'
};

// Grid and spacing
export const GRID_SIZES = [0.25, 0.5, 1, 2];
export const DEFAULT_GRID_SIZE = 0.5;
export const DEFAULT_FRAME_SPACING = 1;

// Background image
export const BACKGROUND_IMAGE_FIXED_HEIGHT_METERS = 2.4;
export const METERS_TO_INCHES = 39.3701;
export const BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES =
    BACKGROUND_IMAGE_FIXED_HEIGHT_METERS * METERS_TO_INCHES;

// Collision detection
export const EPSILON = 0.001; // For floating point comparisons

// Events
export const EVENTS = {
    FRAME_MOVE: 'frameMove',
    FRAME_DELETE: 'frameDelete',
    FRAME_UPDATE: 'frameUpdate',
    COLLECTION_EMPTY: 'collectionEmpty'
};
```

### 5. Remove Debug Logs

**Script to find all console.log:**
```bash
# Run this to find all console.log statements
grep -rn "console.log" js/
```

**Replace throughout codebase:**
```javascript
// Import logger at top of each file
import { logger } from './logger.js';

// Replace all instances:
// console.log(...) → logger.debug(...)
// console.warn(...) → logger.warn(...)
// console.error(...) → logger.error(...)
// console.info(...) → logger.info(...)
```

### 6. Add Input Validation (functions.php)

**Add to functions.php:**
```php
/**
 * Validate and sanitize file upload
 */
function validate_image_upload($file) {
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
    $max_size = 5 * 1024 * 1024; // 5MB

    // Check if file exists
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return ['error' => 'No file uploaded'];
    }

    // Check file size
    if ($file['size'] > $max_size) {
        return ['error' => 'File too large. Maximum 5MB'];
    }

    // Check MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowed_types)) {
        return ['error' => 'Invalid file type. Only JPEG, PNG, GIF allowed'];
    }

    // Check image dimensions (optional)
    $image_info = getimagesize($file['tmp_name']);
    if ($image_info === false) {
        return ['error' => 'Invalid image file'];
    }

    return ['success' => true];
}

/**
 * Sanitize frame data
 */
function sanitize_frame_data($data) {
    return [
        'printWidth' => floatval($data['printWidth'] ?? 0),
        'printHeight' => floatval($data['printHeight'] ?? 0),
        'mattWidth' => floatval($data['mattWidth'] ?? 0),
        'frameWidth' => intval($data['frameWidth'] ?? 20),
        'frameMaterial' => sanitize_text_field($data['frameMaterial'] ?? 'black'),
        'count' => max(1, intval($data['count'] ?? 1))
    ];
}
```

## Short-term Updates (High Priority - Week 2-3)

### 7. Add Error Handler (js/errorHandler.js)

**New File:**
```javascript
// js/errorHandler.js
import { logger } from './logger.js';

export class ErrorHandler {
    static handle(error, context = 'Unknown') {
        logger.error(`Error in ${context}:`, error);

        // Show user-friendly message
        this.showUserMessage(this.getUserFriendlyMessage(error));

        // Log to monitoring service
        this.logToService(error, context);
    }

    static getUserFriendlyMessage(error) {
        // Map error types to user-friendly messages
        if (error.name === 'TypeError') {
            return 'An unexpected error occurred. Please refresh the page.';
        }
        if (error.name === 'NetworkError') {
            return 'Network error. Please check your connection.';
        }
        if (error.message.includes('localStorage')) {
            return 'Unable to save data. Please check your browser settings.';
        }
        return 'An error occurred. Please try again.';
    }

    static showUserMessage(message) {
        // Create better UI notification instead of alert
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 16px 24px;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    static logToService(error, context) {
        // Send to error monitoring service (Sentry, LogRocket, etc.)
        if (window.location.hostname !== 'localhost') {
            // Example: Sentry.captureException(error, { tags: { context } });
        }
    }

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
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
```

### 8. Add Performance Utilities (js/performance.js)

**New File:**
```javascript
// js/performance.js

/**
 * Debounce function calls
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle function calls
 */
export function throttle(func, delay) {
    let lastCall = 0;
    let timeoutId = null;

    return function(...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        if (timeSinceLastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, delay - timeSinceLastCall);
        }
    };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback) {
    if (window.requestIdleCallback) {
        return window.requestIdleCallback(callback);
    }
    return setTimeout(callback, 1);
}

/**
 * Cache DOM queries
 */
export class DOMCache {
    constructor() {
        this.cache = new Map();
    }

    get(selector) {
        if (!this.cache.has(selector)) {
            this.cache.set(selector, document.querySelector(selector));
        }
        return this.cache.get(selector);
    }

    getAll(selector) {
        if (!this.cache.has(selector)) {
            this.cache.set(selector, document.querySelectorAll(selector));
        }
        return this.cache.get(selector);
    }

    invalidate(selector) {
        if (selector) {
            this.cache.delete(selector);
        } else {
            this.cache.clear();
        }
    }
}
```

### 9. Improve PriceCalculator.js

**Current:** Magic numbers everywhere

**Updated:**
```javascript
// js/PriceCalculator.js
import {
    PRICE_MARKUP, TAX_RATE, ADDITIONAL_MARKUP,
    FRAME_INCREMENT, PRINT_MARKUP, FRAME_20MM_MARKUP,
    BASE_FEE, ADDITIONAL_FEE
} from './constants.js';
import { logger } from './logger.js';

// Frame depth configuration
const FRAME_DEPTHS = {
    '20': 4, // cm
    '30': 3, // cm
    '40': 4  // cm
};

// Pricing coefficients
const PRICING = {
    BASE_COST: 0.75,
    AREA_COEFFICIENT: 23.07,
    LINEAR_30MM: 2.92,
    LINEAR_OTHER: 3.57,
    MULTIPLIER: 1.5,
    BASE_ADDITION: 22,
    FRAME_MULTIPLIER: 2,
    PRINT_AREA_COEFFICIENT: 166.8759,
    PRINT_BASE: 0.174256
};

function round(value, decimals) {
    if (isNaN(value)) {
        logger.warn('round() called with NaN value');
        return 0;
    }
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals) || 0;
}

function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

function calculateBaseFineArtPrint(width_cm, height_cm) {
    // Validate inputs
    if (width_cm <= 0 || height_cm <= 0) {
        throw new Error('Invalid dimensions for print calculation');
    }

    // Convert dimensions to meters and calculate area
    const area = (width_cm / 100) * (height_cm / 100);

    // Base calculation
    let pricing = round(
        area * PRICING.PRINT_AREA_COEFFICIENT + PRICING.PRINT_BASE,
        2
    );

    // Apply markups
    pricing = round(pricing * TAX_RATE, 2);
    pricing = round(pricing * ADDITIONAL_MARKUP, 2);
    pricing = round(pricing * PRICE_MARKUP, 2);

    logger.debug('Print pricing calculated:', {
        dimensions: { width_cm, height_cm },
        area,
        finalPrice: pricing
    });

    return pricing;
}

function calculateBaseFrameCost(width_cm, length_cm, mat_size_cm, frame_type) {
    // Validate inputs
    if (width_cm <= 0 || length_cm <= 0 || mat_size_cm < 0) {
        throw new Error('Invalid dimensions for frame calculation');
    }

    if (!FRAME_DEPTHS[frame_type]) {
        throw new Error(`Invalid frame type: ${frame_type}`);
    }

    // Calculate frame dimensions
    const frameDepth = FRAME_DEPTHS[frame_type];
    const frameWidth = width_cm + (mat_size_cm * 2) + (frameDepth * 2);
    const frameHeight = length_cm + (mat_size_cm * 2) + (frameDepth * 2);

    // Calculate measurements
    const frameSqm = (frameWidth / 100) * (frameHeight / 100);
    const linearMeter = ((frameWidth / 100) * 2) + ((frameHeight / 100) * 2);

    // Select linear coefficient based on frame type
    const linearCoef = frame_type === '30'
        ? PRICING.LINEAR_30MM
        : PRICING.LINEAR_OTHER;

    // Calculate base frame cost
    let framePrice = (
        (PRICING.BASE_COST +
         frameSqm * PRICING.AREA_COEFFICIENT +
         linearCoef * linearMeter) *
        PRICING.MULTIPLIER +
        PRICING.BASE_ADDITION
    ) * PRICING.FRAME_MULTIPLIER;

    // Apply markups
    framePrice = round(framePrice * PRICE_MARKUP, 2);
    framePrice = round(framePrice * TAX_RATE, 2);

    logger.debug('Frame pricing calculated:', {
        dimensions: { width_cm, length_cm, mat_size_cm },
        frame_type,
        measurements: { frameSqm, linearMeter },
        finalPrice: framePrice
    });

    return framePrice;
}

// ... rest of the class
```

### 10. Add Accessibility Improvements

**Update Frame.js:**
```javascript
// In createFrameElement()
createFrameElement() {
    const element = createElement(`
        <div class="frame"
             tabindex="0"
             role="button"
             aria-label="Frame ${this.id}, ${formatMeasurement(this.width)} × ${formatMeasurement(this.height)}"
             aria-describedby="frame-${this.id}-details">
            <div class="frame-dimensions" id="frame-${this.id}-details">
                ${formatMeasurement(this.width)} × ${formatMeasurement(this.height)}
            </div>
            <div class="frame-controls" role="toolbar" aria-label="Frame controls">
                <button class="delete-btn" aria-label="Delete frame">×</button>
                <button class="frame-info-btn"
                        aria-label="View frame details">?</button>
                <button class="photo-upload-btn"
                        aria-label="Upload photo">📷</button>
            </div>
            <!-- rest of content -->
        </div>
    `);

    // Add keyboard navigation
    element.addEventListener('keydown', this.handleKeyDown.bind(this));

    return element;
}

handleKeyDown(e) {
    const MOVE_STEP = 1; // inch

    switch(e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
            e.preventDefault();
            this.handleArrowKey(e.key, MOVE_STEP);
            break;
        case 'Delete':
        case 'Backspace':
            e.preventDefault();
            this.remove();
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            this.showFrameInfo();
            break;
    }
}

handleArrowKey(key, step) {
    const oldX = this.x;
    const oldY = this.y;

    switch(key) {
        case 'ArrowUp': this.y = Math.max(0, this.y - step); break;
        case 'ArrowDown':
            this.y = Math.min(this.wallDimensions.height - this.height, this.y + step);
            break;
        case 'ArrowLeft': this.x = Math.max(0, this.x - step); break;
        case 'ArrowRight':
            this.x = Math.min(this.wallDimensions.width - this.width, this.x + step);
            break;
    }

    // Check for collisions
    const otherFrames = this.planner ?
        this.planner.getAllFrameObjects().filter(f => f.id !== String(this.id)) : [];

    const collision = this.dragManager.checkCollision(
        this.x, this.y, String(this.id), otherFrames
    );

    if (collision.collides) {
        // Revert movement
        this.x = oldX;
        this.y = oldY;
        // Announce to screen reader
        this.announceCollision();
    } else {
        this.updatePosition();
        this.announcePosition();
    }
}

announceCollision() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = 'Cannot move frame - collision detected';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

announcePosition() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Frame moved to ${formatMeasurement(this.x)}, ${formatMeasurement(this.y)}`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}
```

**Add to styles.css:**
```css
/* Screen reader only class */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}

/* Focus indicators */
.frame:focus {
    outline: 3px solid #2196F3;
    outline-offset: 2px;
    z-index: 11;
}

button:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    .frame:focus {
        outline-width: 4px;
    }
}
```

## Medium-term Updates (Should Have - Month 1)

### 11. Add Unit Tests

**Create `tests/unit/PriceCalculator.test.js`:**
```javascript
import { describe, it, expect } from 'vitest';
import PriceCalculator from '../../js/PriceCalculator.js';

describe('PriceCalculator', () => {
    const calculator = new PriceCalculator();

    describe('calculateBaseFineArtPrint', () => {
        it('should calculate correct price for standard dimensions', () => {
            const result = calculator.calculateBaseFineArtPrint(40, 50);
            expect(result).toBeGreaterThan(0);
            expect(typeof result).toBe('number');
        });

        it('should throw error for invalid dimensions', () => {
            expect(() => {
                calculator.calculateBaseFineArtPrint(0, 50);
            }).toThrow('Invalid dimensions');
        });
    });

    describe('calculateFrameAndPrintPrice', () => {
        it('should calculate correct total for 20mm frame', () => {
            const result = calculator.calculateFrameAndPrintPrice(40, 50, 5, '20');

            expect(result).toHaveProperty('frameCost');
            expect(result).toHaveProperty('printCost');
            expect(result).toHaveProperty('totalPrice');

            expect(result.frameCost).toBeGreaterThan(0);
            expect(result.printCost).toBeGreaterThan(0);
            expect(result.totalPrice).toBeGreaterThan(result.frameCost + result.printCost);
        });

        it('should apply 12% markup to 20mm frames', () => {
            const result20 = calculator.calculateFrameAndPrintPrice(40, 50, 5, '20');
            const result30 = calculator.calculateFrameAndPrintPrice(40, 50, 5, '30');

            expect(result20.frameCost).toBeGreaterThan(result30.frameCost);
        });
    });
});
```

**Create `tests/unit/utils.test.js`:**
```javascript
import { describe, it, expect } from 'vitest';
import { formatMeasurement, cmToInches, mmToInches } from '../../js/utils.js';

describe('utils', () => {
    describe('formatMeasurement', () => {
        it('should format to one decimal place', () => {
            expect(formatMeasurement(10.567)).toBe('10.6"');
            expect(formatMeasurement(5)).toBe('5.0"');
        });
    });

    describe('cmToInches', () => {
        it('should convert correctly', () => {
            expect(cmToInches(2.54)).toBeCloseTo(1, 2);
            expect(cmToInches(5)).toBeCloseTo(1.9685, 2);
        });
    });

    describe('mmToInches', () => {
        it('should convert correctly', () => {
            expect(mmToInches(25.4)).toBeCloseTo(1, 2);
            expect(mmToInches(50)).toBeCloseTo(1.9685, 2);
        });
    });
});
```

### 12. Add E2E Tests

**Create `tests/e2e/basic-workflow.spec.js`:**
```javascript
import { test, expect } from '@playwright/test';

test.describe('Wall Art Planner', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173'); // Or your dev server
    });

    test('should load the main page', async ({ page }) => {
        await expect(page).toHaveTitle(/Wall Art Planner/);
        await expect(page.locator('.wall-canvas')).toBeVisible();
    });

    test('should add a frame collection', async ({ page }) => {
        // Set frame dimensions
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.fill('#mattWidth', '5');
        await page.selectOption('#frameWidth', '20');
        await page.fill('#frameCount', '1');

        // Add collection
        await page.click('#addCollection');

        // Verify frame was added
        await expect(page.locator('.frame')).toHaveCount(1);
    });

    test('should drag a frame', async ({ page }) => {
        // Add a frame first
        await page.click('#addCollection');

        const frame = page.locator('.frame').first();
        const initialBox = await frame.boundingBox();

        // Drag frame
        await frame.dragTo(page.locator('.wall-canvas'), {
            targetPosition: { x: 200, y: 200 }
        });

        const finalBox = await frame.boundingBox();

        // Verify position changed
        expect(finalBox.x).not.toBe(initialBox.x);
        expect(finalBox.y).not.toBe(initialBox.y);
    });

    test('should delete a frame', async ({ page }) => {
        // Add a frame
        await page.click('#addCollection');
        await expect(page.locator('.frame')).toHaveCount(1);

        // Delete it
        await page.click('.delete-btn');

        // Verify removed
        await expect(page.locator('.frame')).toHaveCount(0);
    });

    test('should calculate price', async ({ page }) => {
        // Add a frame
        await page.click('#addCollection');

        // Calculate price
        await page.click('#calculatePrice');

        // Verify modal appears
        await expect(page.locator('#priceSummaryModal')).toBeVisible();

        // Verify price is displayed
        await expect(page.locator('.grand-total')).toContainText('$');
    });
});
```

### 13. Vite Configuration

**Create `vite.config.js`:**
```javascript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                frameCalculator: path.resolve(__dirname, 'frame-calculator.html'),
                printCalculator: path.resolve(__dirname, 'print-calculator.html'),
                orderForm: path.resolve(__dirname, 'order-form.html'),
            },
        },
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.* in production
            },
        },
    },
    server: {
        port: 5173,
        open: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.js',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.test.js',
                '**/*.spec.js',
            ],
        },
    },
});
```

### 14. Playwright Configuration

**Create `playwright.config.js`:**
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
```

## Implementation Priority

1. **Week 1** (Critical Security Fixes):
   - Fix session handling (1-2 hours)
   - Replace base64 encoding (2-3 hours)
   - Add input validation (3-4 hours)
   - Remove debug logs (2-3 hours)
   - Create logger (2 hours)

2. **Week 2** (Code Quality):
   - Extract constants (3-4 hours)
   - Add error handler (2-3 hours)
   - Add performance utilities (2 hours)
   - Cache DOM queries (2-3 hours)

3. **Week 3** (Accessibility):
   - Add ARIA labels (2-3 hours)
   - Implement keyboard navigation (4-5 hours)
   - Add focus management (2-3 hours)
   - Test with screen readers (2-3 hours)

4. **Week 4** (Testing Setup):
   - Set up Vitest (1-2 hours)
   - Write unit tests (8-10 hours)
   - Set up Playwright (1-2 hours)
   - Write E2E tests (6-8 hours)

Total estimated effort: **60-80 hours**

## Success Metrics

- [ ] All critical security issues resolved
- [ ] Test coverage > 80%
- [ ] No console.log in production builds
- [ ] All accessibility tests passing
- [ ] Build size < 500KB
- [ ] Lighthouse score > 90
- [ ] WCAG 2.1 AA compliant

---

**Next Steps:**
1. Review and prioritize updates
2. Create implementation plan
3. Set up development environment
4. Begin with critical security fixes
5. Implement testing infrastructure
6. Iterate on improvements
