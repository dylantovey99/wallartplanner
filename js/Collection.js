import { formatMeasurement, createElement, getRandomColor, cmToInches } from './utils.js';
import Frame from './Frame.js';

export default class Collection {
    static nextId = 1;

    constructor(data, wallDimensions, planner) { // Added planner argument
        // Restore a persisted id when provided so saved state stays stable across reloads
        this.id = data.id != null ? Number(data.id) : Collection.nextId++;
        if (this.id >= Collection.nextId) Collection.nextId = this.id + 1;
        this.planner = planner; // Store planner instance
        
        // Store exact values without rounding
        this.printWidth = Number(data.printWidth);
        this.printHeight = Number(data.printHeight);
        // mattWidth from data is expected in CM, convert to inches for internal use
        this.mattWidth = cmToInches(Number(data.mattWidth)); 
        this.frameWidth = Number(data.frameWidth); // frameWidth is already in inches
        // Restored collections may not carry count; fall back to the number of saved frames
        const parsedCount = Math.round(Number(data.count));
        this.count = parsedCount >= 1 ? parsedCount
            : (Array.isArray(data.frames) ? Math.max(1, data.frames.length) : 1);
        this.color = data.color || getRandomColor(); // For collection legend and print area
        this.frameMaterial = data.frameMaterial || 'black'; // For the frame itself
        this.wallDimensions = wallDimensions;
        this.frames = [];
        
        if (data.frames) {
            // Restore frames from saved data
            this.restoreFrames(data.frames);
        } else {
            // Create new frames
            this.createFrames();
        }
        this.element = this.createCollectionElement();
    }

    createFrames() {
        // Get existing frames on the wall to avoid collisions using planner's live data
        const existingFramesFromPlanner = this.planner ? this.planner.getAllFrameObjects() : [];

        // data.mattWidth is already in CM from constructor, this.mattWidth is in inches.
        // For Frame constructor, we need mattWidth in CM.
        const mattWidthCm = Number(this.planner.newCollection.mattWidth); // Or get from original data if passed through
        // Let's assume data passed to Collection constructor (this.newCollection in WallArtPlanner) has mattWidth in CM.
        // So, when creating a Frame, we should pass the CM value.
        // The Frame constructor will convert it to inches.
        // this.mattWidth is already in inches.
        
        const frameData = {
            printWidth: this.printWidth,
            printHeight: this.printHeight,
            mattWidth: parseFloat(this.mattWidth * 2.54), // Convert internal inches back to CM for Frame constructor
            frameWidth: this.frameWidth // This is in inches
        };
        


        // Calculate total dimensions for position generation with exact precision
        const totalWidth = this.printWidth + (2 * this.mattWidth) + (2 * this.frameWidth);
        const totalHeight = this.printHeight + (2 * this.mattWidth) + (2 * this.frameWidth);


        // planner.frameSpacing is the source of truth (the UI select feeds it)
        const spacing = this.planner ? Number(this.planner.frameSpacing) : 1;

        let lastX = spacing;
        let lastY = spacing;

        // Calculate row height including spacing
        const rowHeight = totalHeight + spacing;
        
        // Use the already fetched existingFramesFromPlanner for the rest of the method
        const existingFrames = [...existingFramesFromPlanner]; // Create a mutable copy for this collection's placement logic


        // Calculate grid cells for more organized placement.
        // Round the cell size UP to a multiple of the movement grid: frames get
        // snapped to that grid after placement, and an exact totalWidth+spacing
        // cell can snap into a gap slightly under the minimum spacing — which
        // leaves every frame in a resting collision state that blocks dragging.
        const gridSizeVal = this.planner && this.planner.gridSizeSelect
            ? Number(this.planner.gridSizeSelect.value) : 0.5;
        const snapUp = (v) => gridSizeVal > 0 ? Math.ceil(v / gridSizeVal) * gridSizeVal : v;
        const gridCellWidth = snapUp(totalWidth + spacing);
        const gridCellHeight = snapUp(totalHeight + spacing);
        // A frame wider than the wall would make maxCols 0 and i % 0 produce NaN positions
        const maxCols = Math.max(1, Math.floor((this.wallDimensions.width - spacing) / gridCellWidth));

        for (let i = 0; i < this.count; i++) {
            // Calculate grid-based position
            const col = i % maxCols;
            const row = Math.floor(i / maxCols);
            
            let posX = spacing + (col * gridCellWidth);
            let posY = spacing + (row * gridCellHeight);
            
            // Check if this position would collide with existing frames
            let collision = this.checkPositionCollision(posX, posY, totalWidth, totalHeight, existingFrames);
            
            // If there's a collision, try to find a free spot
            if (collision) {
                
                // Try different positions in a spiral pattern
                const spiralPositions = this.generateSpiralPositions(maxCols, 5); // Try up to 5 rows in spiral
                let foundPosition = false;
                
                for (const offset of spiralPositions) {
                    const testX = spacing + (offset.col * gridCellWidth);
                    const testY = spacing + (offset.row * gridCellHeight);
                    
                    // Ensure position is within wall boundaries
                    if (testX + totalWidth > this.wallDimensions.width || 
                        testY + totalHeight > this.wallDimensions.height) {
                        continue;
                    }
                    
                    if (!this.checkPositionCollision(testX, testY, totalWidth, totalHeight, existingFrames)) {
                        posX = testX;
                        posY = testY;
                        foundPosition = true;
                        break;
                    }
                }
                
                if (!foundPosition) {
                    // If no free position found, place at original position and let user adjust
                }
            }
            
            const position = {
                x: Math.max(0, Math.min(posX, this.wallDimensions.width - totalWidth)),
                y: Math.max(0, Math.min(posY, this.wallDimensions.height - totalHeight))
            };

            // Pass planner instance to Frame constructor
            const frame = new Frame(frameData, position, this.color, this.wallDimensions, this.frameMaterial, this.planner);
            frame.collection = this; // Back-reference so frameDelete events can carry the collection id
            this.frames.push(frame);
            
            // Add this frame to existing frames to avoid placing subsequent frames on top
            existingFrames.push({
                id: String(frame.id),
                x: posX,
                y: posY,
                width: totalWidth,
                height: totalHeight
            });
        }

    }
    
    checkPositionCollision(x, y, width, height, existingFrames) {
        // planner.frameSpacing is the source of truth (the UI select feeds it)
        const minDistance = this.planner ? Number(this.planner.frameSpacing) : 1;

        for (const otherFrame of existingFrames) { // Changed loop variable name for clarity
            const horizontalOverlap = 
                x < (otherFrame.x + otherFrame.width + minDistance) && 
                otherFrame.x < (x + width + minDistance); // CORRECTED: otherFrame.x
            
            const verticalOverlap = 
                y < (otherFrame.y + otherFrame.height + minDistance) && 
                otherFrame.y < (y + height + minDistance); // CORRECTED: otherFrame.y

            if (horizontalOverlap && verticalOverlap) {
                return true;
            }
        }
        return false;
    }
    
    generateSpiralPositions(maxCols, maxRows) {
        // Generate positions in a spiral pattern starting from center
        const positions = [];
        const centerCol = Math.floor(maxCols / 2);
        const centerRow = Math.floor(maxRows / 2);
        
        // Add center position first
        positions.push({ row: centerRow, col: centerCol });
        
        // Generate spiral around center
        for (let layer = 1; layer <= Math.max(maxCols, maxRows); layer++) {
            // Top row of layer (moving right)
            for (let c = -layer + 1; c <= layer; c++) {
                positions.push({ row: centerRow - layer, col: centerCol + c });
            }
            
            // Right column of layer (moving down)
            for (let r = -layer + 1; r <= layer; r++) {
                positions.push({ row: centerRow + r, col: centerCol + layer });
            }
            
            // Bottom row of layer (moving left)
            for (let c = layer - 1; c >= -layer; c--) {
                positions.push({ row: centerRow + layer, col: centerCol + c });
            }
            
            // Left column of layer (moving up)
            for (let r = layer - 1; r >= -layer; r--) {
                positions.push({ row: centerRow + r, col: centerCol - layer });
            }
        }
        
        // Filter out positions outside the grid
        return positions.filter(pos => 
            pos.row >= 0 && pos.row < maxRows && 
            pos.col >= 0 && pos.col < maxCols
        );
    }

    restoreFrames(framesData) {
        
        framesData.forEach((frameData, index) => {
            // mattWidth in collectionData (from WallArtPlanner's state.collections) is already in CM.
            // this.mattWidth (Collection's internal) is in inches.
            // Frame constructor expects mattWidth in CM.
            const mattWidthForFrameConstructor = parseFloat(this.mattWidth * 2.54); // Convert internal inches back to CM

            const frame = new Frame({
                id: frameData.id, // Preserve the persisted frame id when present
                printWidth: this.printWidth,
                printHeight: this.printHeight,
                mattWidth: mattWidthForFrameConstructor, // Pass CM value
                frameWidth: this.frameWidth // This is in inches
            }, {
                x: Number(frameData.x),
                y: Number(frameData.y)
            }, this.color, this.wallDimensions, this.frameMaterial, this.planner); // Pass planner
            frame.collection = this; // Back-reference so frameDelete events can carry the collection id

            // Restore thumbnail image if it exists
            if (frameData.thumbnailImage) {
                frame.thumbnailImage = frameData.thumbnailImage;
                frame.applyThumbnailImage(frameData.thumbnailImage);
            }
            
            this.frames.push(frame);
        });

    }

    serialize() {
        // this.mattWidth is in inches. Convert back to CM for serialization.
        const mattWidthCm = parseFloat((this.mattWidth * 2.54).toFixed(2)); // Ensure it's a number with reasonable precision
        
        return {
            id: this.id,
            printWidth: this.printWidth,
            printHeight: this.printHeight,
            mattWidth: mattWidthCm, // Store in CM
            frameWidth: this.frameWidth, // This is in inches
            color: this.color, // Print area/collection color
            frameMaterial: this.frameMaterial, // Frame's own material
            count: this.frames.length,
            frames: this.frames.map(frame => ({
                id: frame.id,
                x: frame.x,
                y: frame.y,
                thumbnailImage: frame.thumbnailImage || null
            }))
        };
    }

    createCollectionElement() {
        const element = createElement(`
            <div class="collection-item" data-collection-id="${this.id}">
                <div class="collection-info">
                    ${formatMeasurement(this.printWidth)} × ${formatMeasurement(this.printHeight)}
                    (${this.frames.length} frames)
                </div>
            </div>
        `);

        element.style.borderLeft = `4px solid ${this.color}`;
        return element;
    }

    updateLegendCount() {
        const info = this.element.querySelector('.collection-info');
        info.textContent = `${formatMeasurement(this.printWidth)} × ${formatMeasurement(this.printHeight)} (${this.frames.length} frames)`;
    }


    addToWall(wallElement) {

        // Add each frame to the wall and immediately register its details
        this.frames.forEach((frame, index) => {
            wallElement.appendChild(frame.element);
            
            // Immediately dispatch frameMove event with initial position
            const eventDetail = {
                x: frame.x,
                y: frame.y,
                width: frame.width,
                height: frame.height,
                printWidth: frame.printWidth,
                printHeight: frame.printHeight,
                mattWidth: frame.mattWidth,
                frameWidth: frame.frameWidth
            };

            frame.element.dispatchEvent(new CustomEvent('frameMove', {
                bubbles: true,
                detail: eventDetail
            }));
        });

        // Update positions after all frames are added
        requestAnimationFrame(() => {
            this.frames.forEach(frame => {
                frame.updatePosition();
            });
        });
    }

    remove() {
        this.frames.forEach(frame => frame.remove()); // Use Frame's remove method
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
