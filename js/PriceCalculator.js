import { PRICING, FRAME_DEPTHS } from './constants.js';
import { logger } from './logger.js';

/**
 * Round number to specified decimals
 * @param {number} value Value to round
 * @param {number} decimals Number of decimal places
 * @returns {number} Rounded value
 */
function round(value, decimals) {
    if (isNaN(value)) {
        logger.warn('round() called with NaN value');
        return 0;
    }
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals) || 0;
}

/**
 * Format price as currency string
 * @param {number} price Price value
 * @returns {string} Formatted price
 */
function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

/**
 * Calculate base cost for fine art print
 * @param {number} width_cm Print width in centimeters
 * @param {number} height_cm Print height in centimeters
 * @returns {number} Print cost
 */
function calculateBaseFineArtPrint(width_cm, height_cm) {
    // Validate inputs
    if (width_cm <= 0 || height_cm <= 0) {
        logger.error('Invalid dimensions for print calculation:', { width_cm, height_cm });
        throw new Error('Invalid dimensions for print calculation');
    }

    // Convert dimensions to meters and calculate area
    const area = (width_cm / 100) * (height_cm / 100);

    // Base calculation with rounding
    let pricing = round(area * PRICING.PRINT_AREA_COEFFICIENT + PRICING.PRINT_BASE, 2);

    // Apply tax and markups
    pricing = round(pricing * PRICING.TAX_RATE, 2);
    pricing = round(pricing * PRICING.ADDITIONAL_MARKUP, 2);
    pricing = round(pricing * PRICING.MARKUP, 2);

    logger.debug('Print pricing calculated:', {
        dimensions: { width_cm, height_cm },
        area,
        finalPrice: pricing
    });

    return pricing;
}

/**
 * Calculate base frame cost
 * @param {number} width_cm Frame width in centimeters
 * @param {number} length_cm Frame height in centimeters
 * @param {number} mat_size_cm Mat width in centimeters
 * @param {string} frame_type Frame type ('20', '30', '40')
 * @returns {number} Frame cost
 */
function calculateBaseFrameCost(width_cm, length_cm, mat_size_cm, frame_type) {
    // Validate inputs
    if (width_cm <= 0 || length_cm <= 0 || mat_size_cm < 0) {
        logger.error('Invalid dimensions for frame calculation:', {
            width_cm, length_cm, mat_size_cm
        });
        throw new Error('Invalid dimensions for frame calculation');
    }

    if (!FRAME_DEPTHS[frame_type]) {
        logger.error('Invalid frame type:', frame_type);
        throw new Error(`Invalid frame type: ${frame_type}`);
    }

    // Calculate frame dimensions including mat and frame depth
    const frameDepth = FRAME_DEPTHS[frame_type];
    const frameWidth = width_cm + (mat_size_cm * 2) + (frameDepth * 2);
    const frameHeight = length_cm + (mat_size_cm * 2) + (frameDepth * 2);

    // Calculate area and perimeter
    const frameSqm = (frameWidth / 100) * (frameHeight / 100);
    const linearMeter = ((frameWidth / 100) * 2) + ((frameHeight / 100) * 2);

    // Select linear coefficient based on frame type
    const linearCoef = frame_type === '30' ? PRICING.LINEAR_30MM : PRICING.LINEAR_OTHER;

    // Calculate base frame cost
    let framePrice = (
        (PRICING.BASE_COST +
         frameSqm * PRICING.AREA_COEFFICIENT +
         linearCoef * linearMeter) *
        PRICING.MULTIPLIER +
        PRICING.BASE_ADDITION
    ) * PRICING.FRAME_MULTIPLIER;

    // Apply markups
    framePrice = round(framePrice * PRICING.MARKUP, 2);
    framePrice = round(framePrice * PRICING.TAX_RATE, 2);

    logger.debug('Frame pricing calculated:', {
        dimensions: { width_cm, length_cm, mat_size_cm },
        frame_type,
        measurements: { frameSqm, linearMeter },
        finalPrice: framePrice
    });

    return framePrice;
}

/**
 * Calculate combined frame and print price
 * @param {number} width_cm Width in centimeters
 * @param {number} length_cm Height in centimeters
 * @param {number} mat_size_cm Mat width in centimeters
 * @param {string} frame_type Frame type ('20', '30', '40')
 * @returns {{frameCost: number, printCost: number, totalPrice: number}} Price breakdown
 */
function calculateFrameAndPrintPrice(width_cm, length_cm, mat_size_cm, frame_type) {
    // Calculate base costs
    let frameCost = calculateBaseFrameCost(width_cm, length_cm, mat_size_cm, frame_type);
    let printCost = calculateBaseFineArtPrint(width_cm, length_cm);

    // Apply increment to both costs
    printCost = round(printCost * PRICING.FRAME_INCREMENT, 2);
    frameCost = round(frameCost * PRICING.FRAME_INCREMENT, 2);

    // Apply additional markup to 20mm frames
    if (frame_type === '20') {
        frameCost = round(frameCost * PRICING.FRAME_20MM_MARKUP, 2);
    }

    // Apply additional markup to print cost
    printCost = round(printCost * PRICING.PRINT_MARKUP, 2);

    // Calculate total with fees
    let totalPrice = round(
        frameCost + printCost + PRICING.BASE_FEE + PRICING.ADDITIONAL_FEE,
        2
    );

    return {
        frameCost,
        printCost,
        totalPrice
    };
}

/**
 * Determine frame type from width in inches
 * @param {number} frameWidthInches Frame width in inches
 * @returns {string} Frame type ('20', '30', '40')
 */
function getFrameType(frameWidthInches) {
    // Convert inches to mm and match to nearest standard size
    const mm = frameWidthInches * 25.4;
    if (mm <= 25) return '20';
    if (mm <= 35) return '30';
    return '40';
}

class PriceCalculator {
    /**
     * Calculate prices for all frames in collections
     * @param {Array} collections Array of Collection objects
     * @returns {Array} Price results for each frame
     */
    calculateCollectionPrices(collections) {
        const results = [];

        collections.forEach(collection => {
            collection.frames.forEach((frame) => {
                try {
                    // Convert inches to cm for price calculation
                    const width_cm = frame.printWidth * 2.54;
                    const length_cm = frame.printHeight * 2.54;
                    const mat_size_cm = frame.mattWidth * 2.54;
                    const frame_type = getFrameType(frame.frameWidth);

                    logger.debug('Calculating price for frame:', {
                        frameId: frame.id,
                        printWidth: frame.printWidth,
                        printHeight: frame.printHeight,
                        mattWidth: frame.mattWidth,
                        frameWidth: frame.frameWidth,
                        frame_type
                    });

                    const prices = calculateFrameAndPrintPrice(
                        width_cm,
                        length_cm,
                        mat_size_cm,
                        frame_type
                    );

                    logger.debug('Calculated prices:', prices);

                    results.push({
                        collectionId: collection.id,
                        frameId: frame.id,
                        dimensions: {
                            width: frame.printWidth,
                            height: frame.printHeight,
                            mattWidth: frame.mattWidth,
                            frameWidth: frame.frameWidth
                        },
                        prices: {
                            frame: prices.frameCost,
                            print: prices.printCost,
                            total: prices.totalPrice
                        }
                    });
                } catch (error) {
                    logger.error('Error calculating price for frame:', frame.id, error);
                    // Continue with other frames even if one fails
                }
            });
        });

        return results;
    }

    formatPriceResults(results) {
        let html = '<div class="price-summary">';
        
        // Group results by collection
        const byCollection = results.reduce((acc, result) => {
            if (!acc[result.collectionId]) {
                acc[result.collectionId] = [];
            }
            acc[result.collectionId].push(result);
            return acc;
        }, {});

        // Calculate grand total
        const grandTotal = results.reduce((sum, result) => sum + result.prices.total, 0);

        // Generate HTML for each collection
        Object.entries(byCollection).forEach(([collectionId, frames]) => {
            const collectionTotal = frames.reduce((sum, frame) => sum + frame.prices.total, 0);
            
            html += `
                <div class="collection-price">
                    <h3>Collection ${collectionId}</h3>
                    <div class="frames-list">
            `;

            frames.forEach(frame => {
                html += `
                    <div class="frame-price">
                        <div class="frame-details">
                            Frame ${frame.frameId}: ${frame.dimensions.width}" × ${frame.dimensions.height}"
                            (${Math.round(frame.dimensions.frameWidth * 25.4)}mm frame, ${(frame.dimensions.mattWidth * 2.54).toFixed(1)}cm mat)
                        </div>
                        <div class="price-breakdown">
                            <div>Frame: ${formatPrice(frame.prices.frame)}</div>
                            <div>Print: ${formatPrice(frame.prices.print)}</div>
                            <div class="total">Total: ${formatPrice(frame.prices.total)}</div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                    <div class="collection-total">
                        Collection Total: ${formatPrice(collectionTotal)}
                    </div>
                </div>
            `;
        });

        html += `
            <div class="grand-total">
                Grand Total: ${formatPrice(grandTotal)}
            </div>
        </div>`;


        return html;
    }
}

export default PriceCalculator;
