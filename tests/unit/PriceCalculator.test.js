import { describe, it, expect } from 'vitest';
import PriceCalculator from '../../js/PriceCalculator.js';

describe('PriceCalculator', () => {
    const calculator = new PriceCalculator();

    describe('calculateCollectionPrices', () => {
        it('should calculate prices for a simple collection', () => {
            const mockCollection = {
                id: 1,
                frames: [
                    {
                        id: 1,
                        printWidth: 16,
                        printHeight: 20,
                        mattWidth: 1.9685, // 5cm in inches
                        frameWidth: 0.7874  // 20mm in inches
                    }
                ]
            };

            const results = calculator.calculateCollectionPrices([mockCollection]);

            expect(results).toHaveLength(1);
            expect(results[0]).toHaveProperty('collectionId', 1);
            expect(results[0]).toHaveProperty('frameId', 1);
            expect(results[0].prices.frame).toBeGreaterThan(0);
            expect(results[0].prices.print).toBeGreaterThan(0);
            expect(results[0].prices.total).toBeGreaterThan(
                results[0].prices.frame + results[0].prices.print
            );
        });

        it('should handle multiple frames in a collection', () => {
            const mockCollection = {
                id: 1,
                frames: [
                    {
                        id: 1,
                        printWidth: 16,
                        printHeight: 20,
                        mattWidth: 1.9685,
                        frameWidth: 0.7874
                    },
                    {
                        id: 2,
                        printWidth: 20,
                        printHeight: 24,
                        mattWidth: 1.9685,
                        frameWidth: 1.1811 // 30mm
                    }
                ]
            };

            const results = calculator.calculateCollectionPrices([mockCollection]);

            expect(results).toHaveLength(2);
            expect(results[0].frameId).toBe(1);
            expect(results[1].frameId).toBe(2);
        });

        it('should handle errors gracefully and continue processing', () => {
            const mockCollection = {
                id: 1,
                frames: [
                    {
                        id: 1,
                        printWidth: -1, // Invalid
                        printHeight: 20,
                        mattWidth: 1.9685,
                        frameWidth: 0.7874
                    },
                    {
                        id: 2,
                        printWidth: 16, // Valid
                        printHeight: 20,
                        mattWidth: 1.9685,
                        frameWidth: 0.7874
                    }
                ]
            };

            const results = calculator.calculateCollectionPrices([mockCollection]);

            // Should skip invalid frame but process valid one
            expect(results).toHaveLength(1);
            expect(results[0].frameId).toBe(2);
        });
    });

    describe('formatPriceResults', () => {
        it('should format results as HTML', () => {
            const mockResults = [
                {
                    collectionId: 1,
                    frameId: 1,
                    dimensions: {
                        width: 16,
                        height: 20,
                        mattWidth: 1.9685,
                        frameWidth: 0.7874
                    },
                    prices: {
                        frame: 50.00,
                        print: 30.00,
                        total: 80.80
                    }
                }
            ];

            const html = calculator.formatPriceResults(mockResults);

            expect(html).toContain('price-summary');
            expect(html).toContain('Collection 1');
            expect(html).toContain('$50.00');
            expect(html).toContain('$30.00');
            expect(html).toContain('$80.80');
            expect(html).toContain('Grand Total');
        });
    });
});
