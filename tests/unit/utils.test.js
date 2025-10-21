import { describe, it, expect } from 'vitest';
import {
    formatMeasurement,
    cmToInches,
    mmToInches,
    inchesToCm,
    inchesToMm,
    getRandomColor,
    createElement
} from '../../js/utils.js';

describe('utils', () => {
    describe('formatMeasurement', () => {
        it('should format to one decimal place with quote', () => {
            expect(formatMeasurement(10.567)).toBe('10.6"');
            expect(formatMeasurement(5)).toBe('5.0"');
            expect(formatMeasurement(0)).toBe('0.0"');
        });

        it('should handle negative numbers', () => {
            expect(formatMeasurement(-5.5)).toBe('-5.5"');
        });
    });

    describe('conversion functions', () => {
        describe('cmToInches', () => {
            it('should convert centimeters to inches correctly', () => {
                expect(cmToInches(2.54)).toBeCloseTo(1, 2);
                expect(cmToInches(5)).toBeCloseTo(1.9685, 2);
                expect(cmToInches(0)).toBe(0);
            });
        });

        describe('mmToInches', () => {
            it('should convert millimeters to inches correctly', () => {
                expect(mmToInches(25.4)).toBeCloseTo(1, 2);
                expect(mmToInches(50)).toBeCloseTo(1.9685, 2);
                expect(mmToInches(0)).toBe(0);
            });
        });

        describe('inchesToCm', () => {
            it('should convert inches to centimeters correctly', () => {
                expect(inchesToCm(1)).toBeCloseTo(2.54, 2);
                expect(inchesToCm(2)).toBeCloseTo(5.08, 2);
                expect(inchesToCm(0)).toBe(0);
            });
        });

        describe('inchesToMm', () => {
            it('should convert inches to millimeters correctly', () => {
                expect(inchesToMm(1)).toBeCloseTo(25.4, 2);
                expect(inchesToMm(2)).toBeCloseTo(50.8, 2);
                expect(inchesToMm(0)).toBe(0);
            });
        });
    });

    describe('getRandomColor', () => {
        it('should return a valid hex color', () => {
            const color = getRandomColor();
            expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        });

        it('should return different colors (probabilistic)', () => {
            const colors = new Set();
            for (let i = 0; i < 10; i++) {
                colors.add(getRandomColor());
            }
            // Very unlikely to get the same color 10 times
            expect(colors.size).toBeGreaterThan(1);
        });
    });

    describe('createElement', () => {
        it('should create an element from HTML string', () => {
            const html = '<div class="test">Hello</div>';
            const element = createElement(html);

            expect(element.tagName).toBe('DIV');
            expect(element.className).toBe('test');
            expect(element.textContent).toBe('Hello');
        });

        it('should handle complex HTML', () => {
            const html = `
                <div class="container">
                    <span>Text</span>
                    <button>Click</button>
                </div>
            `;
            const element = createElement(html);

            expect(element.tagName).toBe('DIV');
            expect(element.querySelector('span')).toBeTruthy();
            expect(element.querySelector('button')).toBeTruthy();
        });
    });
});
