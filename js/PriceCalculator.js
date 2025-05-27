const PRICE_MARKUP = 1.049;

function round(value, decimals) {
    if (isNaN(value)) return 0;
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals) || 0;
}

function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

function calculateBaseFineArtPrint(width_cm, height_cm) {
    // Convert dimensions to meters and calculate area
    const area = (width_cm/100) * (height_cm/100);
    
    // Base calculation with rounding
    let pricing = round(area * 166.8759 + 0.174256, 2);
    
    // Apply 6% and 9% markups
    pricing = round(pricing * 1.06, 2);
    pricing = round(pricing * 1.09, 2);
    
    // Apply standard markup
    pricing = round(pricing * PRICE_MARKUP, 2);
    
    return pricing;
}

function calculateBaseFrameCost(width_cm, length_cm, mat_size_cm, frame_type) {
    // Calculate frame dimensions including mat and frame depth
    const frameDepth = parseInt(frame_type) === 30 ? 3 : 4;
    const frameWidth = width_cm + (mat_size_cm * 2) + (frameDepth * 2);
    const frameHeight = length_cm + (mat_size_cm * 2) + (frameDepth * 2);

    // Calculate area and perimeter
    const frameSqm = (frameWidth / 100) * (frameHeight / 100);
    const linearMeter = ((frameWidth / 100) * 2) + ((frameHeight / 100) * 2);

    // Calculate base frame cost
    let framePrice;
    if (frame_type === '30') {
        framePrice = ((0.75 + frameSqm * 23.07 + 2.92 * linearMeter) * 1.5 + 22) * 2;
    } else { // Both 40mm and 20mm use 3.57 multiplier
        framePrice = ((0.75 + frameSqm * 23.07 + 3.57 * linearMeter) * 1.5 + 22) * 2;
    }

    // Apply standard markup with rounding
    framePrice = round(framePrice * PRICE_MARKUP, 2);
    
    // Apply 6% markup with rounding
    framePrice = round(framePrice * 1.06, 2);
    
    return framePrice;
}

function calculateFrameAndPrintPrice(width_cm, length_cm, mat_size_cm, frame_type) {
    // Calculate base costs
    let frameCost = calculateBaseFrameCost(width_cm, length_cm, mat_size_cm, frame_type);
    let printCost = calculateBaseFineArtPrint(width_cm, length_cm);
    
    // Apply 7.1% increment to both costs
    printCost = round(printCost * 1.071, 2);
    frameCost = round(frameCost * 1.071, 2);
    
    // Apply additional 12% markup to frame cost if 20mm
    if (frame_type === '20') {
        frameCost = round(frameCost * 1.12, 2);
    }
    
    // Apply additional 4.9% to print cost only
    printCost = round(printCost * 1.049, 2);
    
    // Calculate total with $0.60 fee plus $0.20 additional fee
    let totalPrice = round(frameCost + printCost + 0.60 + 0.20, 2);
    
    return {
        frameCost,
        printCost,
        totalPrice
    };
}

function getFrameType(frameWidthInches) {
    // Convert inches to mm and match to nearest standard size
    const mm = frameWidthInches * 25.4;
    if (mm <= 25) return '20';
    if (mm <= 35) return '30';
    return '40';
}

class PriceCalculator {
    calculateCollectionPrices(collections) {
        const results = [];
        
        collections.forEach(collection => {
            collection.frames.forEach((frame, index) => {
                // Convert inches to cm for print dimensions
                const width_cm = frame.printWidth * 2.54;
                const length_cm = frame.printHeight * 2.54;
                const mat_size_cm = frame.mattWidth * 2.54;
                const frame_type = getFrameType(frame.frameWidth);

                console.log('Calculating price for frame:', {
                    printWidth: frame.printWidth,
                    printHeight: frame.printHeight,
                    mattWidth: frame.mattWidth,
                    frameWidth: frame.frameWidth,
                    width_cm,
                    length_cm,
                    mat_size_cm,
                    frame_type
                });

                const prices = calculateFrameAndPrintPrice(
                    width_cm,
                    length_cm,
                    mat_size_cm,
                    frame_type
                );

                console.log('Calculated prices:', prices);

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
