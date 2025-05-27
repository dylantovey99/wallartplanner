import { formatMeasurement, createElement, getRandomColor, cmToInches } from './utils.js';
import Frame from './Frame.js';

export default class Collection {
    static nextId = 1;

    constructor(data, wallDimensions, planner) { // Added planner argument
        this.id = Collection.nextId++;
        this.planner = planner; // Store planner instance
        console.log(`Collection constructor (ID: ${this.id}) called. Data.count: ${data.count}. Intended frame count for this collection: ${Math.max(1, Math.round(Number(data.count)))}`, JSON.parse(JSON.stringify(data)));
        
        // Store exact values without rounding
        this.printWidth = Number(data.printWidth);
        this.printHeight = Number(data.printHeight);
        // mattWidth from data is expected in CM, convert to inches for internal use
        this.mattWidth = cmToInches(Number(data.mattWidth)); 
        this.frameWidth = Number(data.frameWidth); // frameWidth is already in inches
        this.count = Math.max(1, Math.round(Number(data.count)));
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
        console.log(`Collection ${this.id} createFrames - Initial existingFrames from planner:`, JSON.parse(JSON.stringify(existingFramesFromPlanner)));

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
        
        console.log(`Collection ${this.id} createFrames - frameData for Frame constructor:`, JSON.parse(JSON.stringify(frameData)));


        // Calculate total dimensions for position generation with exact precision
        const totalWidth = this.printWidth + (2 * this.mattWidth) + (2 * this.frameWidth);
        const totalHeight = this.printHeight + (2 * this.mattWidth) + (2 * this.frameWidth);

        console.log(`Collection ${this.id} creating frames with dimensions:`, {
            totalWidth,
            totalHeight,
            frameData
        });

        // Get the current frame spacing from the UI
        const frameSpacingSelect = document.getElementById('frameSpacing');
        const spacing = frameSpacingSelect ? Number(frameSpacingSelect.value) : 1;
        
        console.log(`Using frame spacing of ${spacing} inches for new collection`);
        
        let lastX = spacing;
        let lastY = spacing;

        // Calculate row height including spacing
        const rowHeight = totalHeight + spacing;
        
        // Use the already fetched existingFramesFromPlanner for the rest of the method
        const existingFrames = [...existingFramesFromPlanner]; // Create a mutable copy for this collection's placement logic


        // Calculate grid cells for more organized placement
        const gridCellWidth = totalWidth + spacing;
        const gridCellHeight = totalHeight + spacing;
        const maxCols = Math.floor((this.wallDimensions.width - spacing) / gridCellWidth);
        
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
                console.log(`Initial position for frame ${i + 1} has collision, finding alternative`);
                
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
                        console.log(`Found alternative position at (${posX.toFixed(2)}, ${posY.toFixed(2)})`);
                        break;
                    }
                }
                
                if (!foundPosition) {
                    // If no free position found, place at original position and let user adjust
                    console.log(`No collision-free position found for frame ${i + 1}, using default`);
                }
            }
            
            const position = {
                x: posX,
                y: posY
            };

            console.log(`Collection ${this.id} creating frame ${i + 1}/${this.count} at position:`, position);
            // Pass planner instance to Frame constructor
            const frame = new Frame(frameData, position, this.color, this.wallDimensions, this.frameMaterial, this.planner); 
            
            frame.element.addEventListener('frameDelete', () => {
                // Frame.remove() now dispatches 'frameDelete' which WallArtPlanner listens to.
                // WallArtPlanner will then update its collections.
                // This collection instance needs to know if it becomes empty.
                console.log(`Collection ${this.id} received frameDelete event for frame ${frame.id}. Frame should have been removed by Frame.remove().`);
                this.deleteFrame(frame);
            });
            
            frame.element.addEventListener('frameMove', () => {
                console.log(`Collection ${this.id} handling move for frame ${frame.id}`);
                this.updateLegendCount();
            });
            
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

        console.log(`Collection ${this.id} created ${this.frames.length} frames with final positions:`, 
            this.frames.map(f => ({ id: f.id, x: f.x, y: f.y }))
        );
    }
    
    checkPositionCollision(x, y, width, height, existingFrames) {
        // Get the current frame spacing from the UI
        const frameSpacingSelect = document.getElementById('frameSpacing');
        const minDistance = frameSpacingSelect ? Number(frameSpacingSelect.value) : 1;
        
        for (const otherFrame of existingFrames) { // Changed loop variable name for clarity
            const horizontalOverlap = 
                x < (otherFrame.x + otherFrame.width + minDistance) && 
                otherFrame.x < (x + width + minDistance); // CORRECTED: otherFrame.x
            
            const verticalOverlap = 
                y < (otherFrame.y + otherFrame.height + minDistance) && 
                otherFrame.y < (y + height + minDistance); // CORRECTED: otherFrame.y

            if (horizontalOverlap && verticalOverlap) {
                console.log(`Collision DETECTED between new frame at (${x.toFixed(1)},${y.toFixed(1)}) w:${width.toFixed(1)} h:${height.toFixed(1)} and existing frame ${otherFrame.id} at (${otherFrame.x.toFixed(1)},${otherFrame.y.toFixed(1)}) w:${otherFrame.width.toFixed(1)} h:${otherFrame.height.toFixed(1)} with minDistance: ${minDistance}`);
                return true;
            }
        }
        console.log(`No collision for new frame at (${x.toFixed(1)},${y.toFixed(1)}) w:${width.toFixed(1)} h:${height.toFixed(1)} against ${existingFrames.length} existing frames with minDistance: ${minDistance}`);
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
        console.log(`Collection ${this.id} restoring frames from data:`, framesData);
        
        framesData.forEach((frameData, index) => {
            // mattWidth in collectionData (from WallArtPlanner's state.collections) is already in CM.
            // this.mattWidth (Collection's internal) is in inches.
            // Frame constructor expects mattWidth in CM.
            const mattWidthForFrameConstructor = parseFloat(this.mattWidth * 2.54); // Convert internal inches back to CM

            const frame = new Frame({
                printWidth: this.printWidth,
                printHeight: this.printHeight,
                mattWidth: mattWidthForFrameConstructor, // Pass CM value
                frameWidth: this.frameWidth // This is in inches
            }, {
                x: Number(frameData.x),
                y: Number(frameData.y)
            }, this.color, this.wallDimensions, this.frameMaterial, this.planner); // Pass planner

            frame.element.addEventListener('frameDelete', () => {
                // Frame.remove() now dispatches 'frameDelete' which WallArtPlanner listens to.
                // WallArtPlanner will then update its collections.
                // This collection instance needs to know if it becomes empty.
                console.log(`Collection ${this.id} received frameDelete event for frame ${frame.id} (restored). Frame should have been removed by Frame.remove().`);
                this.deleteFrame(frame); // Still need to remove from this.frames and check if empty
            });
            
            frame.element.addEventListener('frameMove', () => {
                console.log(`Collection ${this.id} handling move for frame ${frame.id}`);
                this.updateLegendCount();
            });
            
            // Restore thumbnail image if it exists
            if (frameData.thumbnailImage) {
                frame.thumbnailImage = frameData.thumbnailImage;
                frame.applyThumbnailImage(frameData.thumbnailImage);
            }
            
            this.frames.push(frame);
            console.log(`Collection ${this.id} restored frame ${index + 1}/${framesData.length} (ID: ${frame.id})`);
        });

        console.log(`Collection ${this.id} restored ${this.frames.length} frames`);
    }

    serialize() {
        // this.mattWidth is in inches. Convert back to CM for serialization.
        const mattWidthCm = parseFloat((this.mattWidth * 2.54).toFixed(2)); // Ensure it's a number with reasonable precision
        
        return {
            printWidth: this.printWidth,
            printHeight: this.printHeight,
            mattWidth: mattWidthCm, // Store in CM
            frameWidth: this.frameWidth, // This is in inches
            color: this.color, // Print area/collection color
            frameMaterial: this.frameMaterial, // Frame's own material
            frames: this.frames.map(frame => ({
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

    deleteFrame(frame) {
        const index = this.frames.indexOf(frame);
        if (index > -1) {
            console.log(`Collection ${this.id} removing frame ${frame.id}`);
            this.frames.splice(index, 1);
            frame.element.remove();
            this.updateLegendCount();
            
            // If this was the last frame, remove the collection
            if (this.frames.length === 0) {
                console.log(`Collection ${this.id} is now empty, removing`);
                this.element.dispatchEvent(new CustomEvent('collectionEmpty'));
            }
        }
    }

    addToWall(wallElement) {
        console.log(`Collection ${this.id} adding ${this.frames.length} frames to wall`);

        // Add each frame to the wall and immediately register its details
        this.frames.forEach((frame, index) => {
            console.log(`Collection ${this.id} adding frame ${frame.id} (${index + 1}/${this.frames.length}) to wall`);
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
        console.log(`Collection ${this.id} removing all frames`);
        this.frames.forEach(frame => frame.remove()); // Use Frame's remove method
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
