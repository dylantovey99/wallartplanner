// Re-export constants for backward compatibility
export { SCALE, DEFAULT_WALL, CONVERSION } from './constants.js';

/**
 * Format measurement in inches with one decimal
 * @param {number} inches Measurement in inches
 * @returns {string} Formatted measurement
 */
export function formatMeasurement(inches) {
    return `${Number(inches).toFixed(1)}"`;
}

/**
 * Create DOM element from HTML string
 * @param {string} htmlString HTML markup
 * @returns {Element} Created element
 */
export function createElement(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

/**
 * Generate random color for collection visualization
 * @returns {string} Hex color code
 */
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * Convert centimeters to inches
 * @param {number} cm Centimeters
 * @returns {number} Inches
 */
export function cmToInches(cm) {
    return cm / 2.54;
}

/**
 * Convert millimeters to inches
 * @param {number} mm Millimeters
 * @returns {number} Inches
 */
export function mmToInches(mm) {
    return mm / 25.4;
}

/**
 * Convert inches to centimeters
 * @param {number} inches Inches
 * @returns {number} Centimeters
 */
export function inchesToCm(inches) {
    return inches * 2.54;
}

/**
 * Convert inches to millimeters
 * @param {number} inches Inches
 * @returns {number} Millimeters
 */
export function inchesToMm(inches) {
    return inches * 25.4;
}
