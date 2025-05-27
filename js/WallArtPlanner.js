import { DEFAULT_WALL, SCALE, mmToInches, formatMeasurement, createElement, cmToInches } from './utils.js';
import Collection from './Collection.js';
import BoundaryTester from './BoundaryTester.js';
import DeletionManager from './DeletionManager.js';

const BACKGROUND_IMAGE_FIXED_HEIGHT_METERS = 2.4;
const METERS_TO_INCHES = 39.3701;
const BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES = BACKGROUND_IMAGE_FIXED_HEIGHT_METERS * METERS_TO_INCHES;

export default class WallArtPlanner {
    constructor() {
        console.log('Initializing WallArtPlanner');
        this.wall = { ...DEFAULT_WALL };
        this.collections = []; // Holds Collection objects, which hold Frame objects
        this.frameDetails = new Map(); // Retained, as it might be used by other features or for event-driven optimizations.
                                     // However, marquee will now primarily use getAllFrameObjects().
        this.frameSpacing = 1;
        this.deletionManager = new DeletionManager(this);
        
        this.newCollection = {
            printWidth: 16,
            printHeight: 20,
            mattWidth: 5, 
            frameWidth: mmToInches(20),
            frameMaterial: 'black',
            count: 1
        };

        this.initializeElements();
        this.createBoundaryMarquee(); // Creates the DOM element for the marquee
        this.setupEventListeners();
        this.loadSavedState(); 
        // updateWallDisplay is called in loadSavedState and setupEventListeners if needed
        // Initial marquee update will happen after frames are loaded/added and dispatch 'frameMove'
        // or explicitly if called by loadSavedState/addCollection.

        window.addEventListener('storage', (event) => {
            if (event.key === 'wallArtPlannerState') {
                this.validateSavedState();
            }
        });
        
        if (typeof BoundaryTester === 'function') {
            // this.boundaryTester = new BoundaryTester(this); // Commented out to hide the boundary testing panel
        } else {
            console.error('[WallArtPlanner] BoundaryTester class not found during initialization.');
        }
    }

    initializeElements() {
        // Wall elements
        this.wallCanvas = document.getElementById('wallCanvas');
        this.wallWidthInput = document.getElementById('wallWidth');
        this.wallHeightInput = document.getElementById('wallHeight');
        this.wallWidthDisplay = document.querySelector('.wall-width-display');
        this.wallHeightDisplay = document.querySelector('.wall-height-display');
        this.gridSizeSelect = document.getElementById('gridSize');
        this.frameSpacingSelect = document.getElementById('frameSpacing');
        this.deleteAllFramesBtn = document.getElementById('deleteAllFramesBtn');
        this.backgroundImageUpload = document.getElementById('backgroundImageUpload');
        this.wallBackgroundImage = document.getElementById('wallBackgroundImage');
        
        // New collection inputs
        this.printWidthInput = document.getElementById('printWidth');
        this.printHeightInput = document.getElementById('printHeight');
        this.mattWidthInput = document.getElementById('mattWidth');
        this.frameWidthSelect = document.getElementById('frameWidth');
        this.frameMaterialSelect = document.getElementById('frameMaterial');
        this.frameCountInput = document.getElementById('frameCount');
        this.addCollectionButton = document.getElementById('addCollection');
        
        // Collections list
        this.collectionsLegend = document.getElementById('collectionsLegend');

        // Ensure elements exist before setting values, especially for test pages
        if (this.wallWidthInput) this.wallWidthInput.value = this.wall.width;
        if (this.wallHeightInput) this.wallHeightInput.value = this.wall.height;
        if (this.printWidthInput) this.printWidthInput.value = this.newCollection.printWidth;
        if (this.printHeightInput) this.printHeightInput.value = this.newCollection.printHeight;
        if (this.mattWidthInput) this.mattWidthInput.value = this.newCollection.mattWidth;
        if (this.frameWidthSelect) this.frameWidthSelect.value = "20"; 
        if (this.frameMaterialSelect) this.frameMaterialSelect.value = this.newCollection.frameMaterial;
        if (this.frameCountInput) this.frameCountInput.value = this.newCollection.count;
        if (this.frameSpacingSelect) this.frameSpacingSelect.value = String(this.frameSpacing);

        this.updateWallDisplay(); // Call initial display update
    }

    setupEventListeners() {
        // Wall dimension changes
        if (this.wallWidthInput) {
            this.wallWidthInput.addEventListener('change', () => {
                this.wall.width = Number(this.wallWidthInput.value);
                this.updateWallDisplay(); // This will call updateBoundaryMarquee
                this.saveState();
            });
        }
        if (this.wallHeightInput) {
            this.wallHeightInput.addEventListener('change', () => {
                this.wall.height = Number(this.wallHeightInput.value);
                this.updateWallDisplay(); // This will call updateBoundaryMarquee
                this.saveState();
            });
        }

        // Grid size changes
        if(this.gridSizeSelect) {
            this.gridSizeSelect.addEventListener('change', () => {
                const gridSize = Number(this.gridSizeSelect.value);
                this.updateGridSize(gridSize); 
                this.saveState();
            });
        }
        
        // Frame spacing changes
        if (this.frameSpacingSelect) {
            this.frameSpacingSelect.addEventListener('change', () => {
                const spacing = Number(this.frameSpacingSelect.value);
                this.updateFrameSpacing(spacing); 
                this.saveState();
            });
        }
        // Add collection button
        if(this.addCollectionButton){
            this.addCollectionButton.addEventListener('click', () => {
                this.addCollection(); 
                this.saveState();
            });
        }

        // Frame movement listener
        if (this.wallCanvas) {
            this.wallCanvas.addEventListener('frameMove', (event) => {
                const frameElement = event.target;
                if (!frameElement.classList.contains('frame') || !event.detail) return;

                const frameId = frameElement.dataset.id || 'unknown';
                console.log(`WallArtPlanner frameMove LISTENER: Frame ID ${frameId} moved. Event detail:`, JSON.parse(JSON.stringify(event.detail)));
                
                // It's crucial to check if the y-coordinate from the event detail matches what we expect
                // or if it has already changed to the cascaded value.
                console.log(`WallArtPlanner frameMove LISTENER: Frame ID ${frameId} - event.detail.y = ${event.detail.y}`);

                this.frameDetails.set(frameElement, { ...event.detail });

                if (this.boundaryMarquee) {
                    requestAnimationFrame(() => this.updateBoundaryMarquee());
                }
                this.saveState(); 
            });
            
            this.wallCanvas.addEventListener('frameUpdate', (event) => { 
                if (!event.target.classList.contains('frame') || !event.detail) return;
                this.saveState();
            });

            this.wallCanvas.addEventListener('frameDelete', (event) => {
                if (!event.target || !event.detail) return;
    
                const frameId = event.detail.frameId;
                const collectionId = event.detail.collectionId;
                
                console.log(`WallArtPlanner received frameDelete event for frame ${frameId}`);
                
                // Use DeletionManager for reliable deletion
                if (collectionId) {
                    this.deletionManager.deleteFrame(frameId, collectionId);
                } else {
                    // Legacy fallback if collectionId not provided
                    this.frameDetails.delete(event.target);
                    
                    // Find the frame in collections and delete it
                    this.collections.forEach(collection => {
                        const frame = collection.frames.find(f => f.id === frameId);
                        if (frame) {
                            this.deletionManager.deleteFrame(frameId, collection.id);
                        }
                    });
                    
                    // Update UI and save state
                    if (this.boundaryMarquee) {
                        requestAnimationFrame(() => this.updateBoundaryMarquee());
                    }
                    this.saveState();
                }
            });
        }


        window.addEventListener('beforeunload', () => this.saveState());

        if (this.deleteAllFramesBtn) {
            this.deleteAllFramesBtn.addEventListener('click', () => this.deleteAllFrames());
        }

        if (this.backgroundImageUpload) {
            this.backgroundImageUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const naturalWidth = img.naturalWidth;
                            const naturalHeight = img.naturalHeight;

                            this.wall.height = BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES;
                            this.wall.width = (naturalWidth / naturalHeight) * BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES;

                            if(this.wallHeightInput) this.wallHeightInput.value = this.wall.height.toFixed(1);
                            if(this.wallWidthInput) this.wallWidthInput.value = this.wall.width.toFixed(1);
                            if(this.wallWidthInput) this.wallWidthInput.readOnly = true;
                            if(this.wallHeightInput) this.wallHeightInput.readOnly = true;
                            if(this.wallBackgroundImage) {
                                this.wallBackgroundImage.src = e.target.result;
                                this.wallBackgroundImage.style.display = 'block';
                            }
                            this.updateWallDisplay();
                            this.saveState();
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                } else {
                    if(this.wallBackgroundImage) {
                        this.wallBackgroundImage.src = '#';
                        this.wallBackgroundImage.style.display = 'none';
                    }
                    if(this.wallWidthInput) this.wallWidthInput.readOnly = false;
                    if(this.wallHeightInput) this.wallHeightInput.readOnly = false;
                    this.saveState();
                }
            });
        }
        
        // New collection input listeners
        if(this.printWidthInput) this.printWidthInput.addEventListener('input', (e) => this.newCollection.printWidth = Number(e.target.value));
        if(this.printHeightInput) this.printHeightInput.addEventListener('input', (e) => this.newCollection.printHeight = Number(e.target.value));
        if(this.mattWidthInput) this.mattWidthInput.addEventListener('input', (e) => this.newCollection.mattWidth = Number(e.target.value));
        if (this.frameWidthSelect) this.frameWidthSelect.addEventListener('change', (e) => this.newCollection.frameWidth = mmToInches(Number(e.target.value)));
        if (this.frameMaterialSelect) this.frameMaterialSelect.addEventListener('change', (e) => this.newCollection.frameMaterial = e.target.value);
        if(this.frameCountInput) this.frameCountInput.addEventListener('input', (e) => this.newCollection.count = Math.max(1, Math.round(Number(e.target.value))));
    }

    getAllFrameObjects() {
        const allFramesData = [];
        
        // Track any problematic frames for debugging
        const problemFrames = [];
        
        this.collections.forEach((collection, collectionIndex) => {
            if (!collection.frames || !Array.isArray(collection.frames)) {
                console.warn(`Collection at index ${collectionIndex} has invalid frames array`);
                return;
            }
            
            collection.frames.forEach((frame, frameIndex) => {
                // Skip invalid frames
                if (!frame) {
                    console.warn(`Null/undefined frame at index ${frameIndex} in collection ${collectionIndex}`);
                    return;
                }
                
                // Validate required properties
                const requiredProps = ['id', 'x', 'y', 'width', 'height'];
                const missingProps = requiredProps.filter(prop => frame[prop] === undefined);
                
                if (missingProps.length > 0) {
                    console.warn(`Frame is missing properties: ${missingProps.join(', ')}`, frame);
                    problemFrames.push({ frame, issues: missingProps });
                    return; // Skip this frame
                }
                
                // Validate numeric properties
                const numericProps = ['x', 'y', 'width', 'height'];
                const nonNumericProps = numericProps.filter(prop => isNaN(frame[prop]));
                
                if (nonNumericProps.length > 0) {
                    console.warn(`Frame has non-numeric properties: ${nonNumericProps.join(', ')}`, frame);
                    problemFrames.push({ frame, issues: nonNumericProps });
                    return; // Skip this frame
                }
                
                // Only include valid frames
                allFramesData.push({
                    id: String(frame.id),
                    x: Number(frame.x),         // Ensure numeric
                    y: Number(frame.y),         // Ensure numeric
                    width: Number(frame.width), // Ensure numeric
                    height: Number(frame.height), // Ensure numeric
                    element: frame.element
                });
            });
        });
        
        if (problemFrames.length > 0) {
            console.error(`Found ${problemFrames.length} problematic frames:`, problemFrames);
        }
        
        return allFramesData;
    }

    deleteAllFrames() {
        if (confirm('Are you sure you want to delete all frames and the background image? This action cannot be undone.')) {
            this.deletionManager.deleteAll(true);
        }
    }

    validateSavedState() {
        try {
            const savedState = localStorage.getItem('wallArtPlannerState');
            if (!savedState) return;
            
            const state = JSON.parse(savedState);
            
            // Check if localStorage has any frames that don't exist in DOM
            if (state.collections) {
                const domFrameIds = Array.from(document.querySelectorAll('.frame'))
                    .map(el => el.dataset.id);
                    
                let needsResave = false;
                
                state.collections.forEach(collection => {
                    if (collection.frames) {
                        // Filter out frames that don't exist in DOM
                        const originalLength = collection.frames.length;
                        collection.frames = collection.frames.filter(frame => 
                            domFrameIds.includes(String(frame.id))
                        );
                        
                        if (collection.frames.length !== originalLength) {
                            needsResave = true;
                        }
                    }
                });
                
                // Remove empty collections
                const originalCollectionsLength = state.collections.length;
                state.collections = state.collections.filter(collection => 
                    collection.frames && collection.frames.length > 0
                );
                
                if (state.collections.length !== originalCollectionsLength) {
                    needsResave = true;
                }
                
                if (needsResave) {
                    localStorage.setItem('wallArtPlannerState', JSON.stringify(state));
                    console.log('Saved state validated and cleaned');
                }
            }
        } catch (error) {
            console.error('Error validating saved state:', error);
        }
    }

    loadSavedState() {
        const savedState = localStorage.getItem('wallArtPlannerState');
        if (!savedState) {
            console.log("No saved state found, using default wall dimensions.");
            this.wall = { ...DEFAULT_WALL }; // Use new 80x80 default
            if(this.wallWidthInput) this.wallWidthInput.value = this.wall.width;
            if(this.wallHeightInput) this.wallHeightInput.value = this.wall.height;
            this.updateWallDisplay(); 
            return;
        }

        try {
            const state = JSON.parse(savedState);
            
            // Validate loaded wall dimensions
            let loadedWidth = state.wall && !isNaN(Number(state.wall.width)) ? Number(state.wall.width) : 0;
            let loadedHeight = state.wall && !isNaN(Number(state.wall.height)) ? Number(state.wall.height) : 0;

            if (loadedWidth > 0 && loadedHeight > 0) {
                this.wall = { width: loadedWidth, height: loadedHeight };
            } else {
                console.warn("Invalid or missing saved wall dimensions, falling back to default.", state.wall);
                this.wall = { ...DEFAULT_WALL }; // Use new 80x80 default
            }
            
            if(this.wallWidthInput) this.wallWidthInput.value = this.wall.width;
            if(this.wallHeightInput) this.wallHeightInput.value = this.wall.height;

            if (state.backgroundImageUrl && this.wallBackgroundImage) {
                this.wallBackgroundImage.src = state.backgroundImageUrl;
                this.wallBackgroundImage.style.display = 'block';
                if(this.wallWidthInput) this.wallWidthInput.readOnly = true;
                if(this.wallHeightInput) this.wallHeightInput.readOnly = true;
            } else if (this.wallBackgroundImage) {
                this.wallBackgroundImage.src = '#';
                this.wallBackgroundImage.style.display = 'none';
                if(this.wallWidthInput) this.wallWidthInput.readOnly = false;
                if(this.wallHeightInput) this.wallHeightInput.readOnly = false;
            }

            if (state.gridSize && this.gridSizeSelect) this.gridSizeSelect.value = state.gridSize;
            if (state.frameSpacing && this.frameSpacingSelect) {
                this.frameSpacing = Number(state.frameSpacing);
                this.frameSpacingSelect.value = String(this.frameSpacing);
            }
            
            if (state.newCollection) {
                this.newCollection = { ...state.newCollection };
                if(this.printWidthInput) this.printWidthInput.value = this.newCollection.printWidth;
                if(this.printHeightInput) this.printHeightInput.value = this.newCollection.printHeight;
                if(this.mattWidthInput) this.mattWidthInput.value = this.newCollection.mattWidth;
                if (this.frameMaterialSelect) this.frameMaterialSelect.value = this.newCollection.frameMaterial || 'black';
                if (this.frameWidthSelect) {
                    const frameWidthMm = Math.round(this.newCollection.frameWidth * 25.4);
                    const options = Array.from(this.frameWidthSelect.options);
                    const closestOption = options.reduce((prev, curr) => 
                        Math.abs(Number(curr.value) - frameWidthMm) < Math.abs(Number(prev.value) - frameWidthMm) ? curr : prev
                    );
                    this.frameWidthSelect.value = closestOption.value;
                }
                if(this.frameCountInput) this.frameCountInput.value = this.newCollection.count;
            }

            if (this.collectionsLegend) this.collectionsLegend.innerHTML = ''; 
            this.collections = []; 
            this.frameDetails.clear(); 

            if (state.collections) {
                state.collections.forEach(collectionData => {
                    const collection = new Collection(collectionData, this.wall, this); 
                    collection.addToWall(this.wallCanvas);
                    if (this.collectionsLegend) this.collectionsLegend.appendChild(collection.element);
                    
                    collection.element.addEventListener('collectionEmpty', () => {
                        const index = this.collections.indexOf(collection);
                        if (index > -1) {
                            this.collections.splice(index, 1);
                            if (this.boundaryMarquee) requestAnimationFrame(() => this.updateBoundaryMarquee());
                            this.saveState();
                        }
                    });
                    this.collections.push(collection);
                });
            }
            this.updateWallDisplay(); 
            
        } catch (error) {
            console.error('Error loading saved state:', error);
            localStorage.removeItem('wallArtPlannerState');
            this.updateWallDisplay(); 
        }
    }

    updateGridSize(size) {
        this.collections.forEach(collection => {
            collection.frames.forEach(frame => frame.setGridSize(size));
        });
    }
    
    updateFrameSpacing(spacing) {
        this.frameSpacing = Number(spacing);
        this.collections.forEach(collection => {
            collection.frames.forEach(frame => {
                if (frame.dragManager) frame.dragManager.setMinDistance(this.frameSpacing);
            });
        });
    }

    updateWallDisplay() {
        if (!this.wallCanvas || !this.wallWidthDisplay || !this.wallHeightDisplay) return;

        let targetPixelWidth = this.wall.width * SCALE;
        let targetPixelHeight = this.wall.height * SCALE;

        // Determine aspect ratio, handle cases where width or height is 0
        const canCalculateAspectRatio = this.wall.width > 0 && this.wall.height > 0;
        const aspectRatio = canCalculateAspectRatio ? (this.wall.width / this.wall.height) : 1; // Default to 1 if cannot calculate

        // Determine maximum visual dimensions for the canvas
        // Max width is the width of the parent element (.wall-section)
        const maxWidthForCanvas = this.wallCanvas.parentElement ? Math.max(this.wallCanvas.parentElement.offsetWidth, 200) : 1150; // Fallback 1150, min 200
        // Max height is defined by CSS for .wall-canvas
        const maxHeightForCanvas = 900; 

        let displayPixelWidth = targetPixelWidth;
        let displayPixelHeight = targetPixelHeight;

        // Step 1: Constrain by width
        if (displayPixelWidth > maxWidthForCanvas) {
            displayPixelWidth = maxWidthForCanvas;
            if (canCalculateAspectRatio) {
                displayPixelHeight = displayPixelWidth / aspectRatio;
            } else if (this.wall.height === 0) {
                displayPixelHeight = 0; // Keep height 0 if logical height is 0
            }
            // If wall.width was 0, displayPixelWidth is already 0 or targetPixelWidth, height remains targetPixelHeight
        }

        // Step 2: Constrain by height (after width adjustment)
        if (displayPixelHeight > maxHeightForCanvas) {
            displayPixelHeight = maxHeightForCanvas;
            if (canCalculateAspectRatio) {
                displayPixelWidth = displayPixelHeight * aspectRatio;
            } else if (this.wall.width === 0) {
                displayPixelWidth = 0; // Keep width 0 if logical width is 0
            }
            // If wall.height was 0, this block is unlikely to be hit unless targetPixelHeight (0) > maxHeightForCanvas (false)
        }

        // Step 3: Re-constrain by width if height constraint changed width and made it too wide again
        if (displayPixelWidth > maxWidthForCanvas) {
            displayPixelWidth = maxWidthForCanvas;
            if (canCalculateAspectRatio) {
                displayPixelHeight = displayPixelWidth / aspectRatio;
            } else if (this.wall.height === 0) {
                // If logical height is 0, and we are constraining by width, height should remain 0
                displayPixelHeight = 0;
            }
        }
        
        // Ensure non-negative dimensions
        displayPixelWidth = Math.max(0, displayPixelWidth);
        displayPixelHeight = Math.max(0, displayPixelHeight);

        this.wallCanvas.style.width = `${displayPixelWidth}px`;
        this.wallCanvas.style.height = `${displayPixelHeight}px`;

        this.wallWidthDisplay.textContent = formatMeasurement(this.wall.width);
        this.wallHeightDisplay.textContent = `Height: ${formatMeasurement(this.wall.height)}`;
        
        if (this.boundaryMarquee) {
            requestAnimationFrame(() => this.updateBoundaryMarquee());
        }
    }

    createBoundaryMarquee() {
        if (!this.wallCanvas) return;
        const existingMarquee = this.wallCanvas.querySelector('.boundary-marquee');
        if (existingMarquee) existingMarquee.remove();
        this.boundaryMarquee = createElement(`<div class="boundary-marquee"><div class="boundary-dimension"></div></div>`);
        this.wallCanvas.appendChild(this.boundaryMarquee);
    }

    updateBoundaryMarquee() {
        if (!this.boundaryMarquee || !this.wallCanvas) {
            return;
        }

        const liveFramesData = this.getAllFrameObjects();
        console.log("------- BOUNDARY MARQUEE UPDATE -------");
        console.log(`Total frames: ${liveFramesData.length}`);
        
        // Detailed frame data logging (kept from previous version)
        liveFramesData.forEach((frame, index) => {
            console.log(`Frame ${index + 1} (ID: ${frame.id}):`, {
                position: { x: frame.x, y: frame.y },
                dimensions: { width: frame.width, height: frame.height },
                bounds: {
                    left: frame.x,
                    right: frame.x + frame.width,
                    top: frame.y,
                    bottom: frame.y + frame.height
                }
            });
        });
        
        if (liveFramesData.length === 0) {
            this.boundaryMarquee.style.display = 'none';
            return;
        }

        // Ensure we have valid numeric values by explicitly checking and filtering
        const validFrames = liveFramesData.filter(frame => {
            return !isNaN(frame.x) && !isNaN(frame.y) && 
                   !isNaN(frame.width) && !isNaN(frame.height) &&
                   frame.width > 0 && frame.height > 0;
        });
        
        if (validFrames.length === 0) {
            console.error("No valid frames found for boundary calculation");
            this.boundaryMarquee.style.display = 'none';
            return;
        }
        
        // Use explicit numeric conversion to prevent string concatenation
        const xValues = validFrames.map(f => Number(f.x));
        const rightEdges = validFrames.map(f => Number(f.x) + Number(f.width));
        const yValues = validFrames.map(f => Number(f.y));
        const bottomEdges = validFrames.map(f => Number(f.y) + Number(f.height));
        
        const minX = Math.min(...xValues);
        const maxX = Math.max(...rightEdges);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...bottomEdges);
        
        // Safeguard against invalid calculations
        if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
            console.error("Invalid boundary calculation results:", { minX, maxX, minY, maxY });
            this.boundaryMarquee.style.display = 'none'; // Hide marquee if calculation is bad
            return;
        }
        
        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;
        
        // Safeguard against negative or zero dimensions
        if (totalWidth <= 0 || totalHeight <= 0) {
            console.error("Invalid boundary dimensions (non-positive):", { totalWidth, totalHeight });
            this.boundaryMarquee.style.display = 'none'; // Hide marquee if dimensions are bad
            return;
        }

        this.boundaryMarquee.style.display = 'block';
        this.boundaryMarquee.style.transform = `translate(${minX * SCALE}px, ${minY * SCALE}px)`;
        this.boundaryMarquee.style.width = `${totalWidth * SCALE}px`;
        this.boundaryMarquee.style.height = `${totalHeight * SCALE}px`;
        
        const dimensionElement = this.boundaryMarquee.querySelector('.boundary-dimension');
        if (dimensionElement) {
            dimensionElement.textContent = 
                `${formatMeasurement(totalWidth)} × ${formatMeasurement(totalHeight)}`;
        }
        
        // Add detailed debug info (NEW PART from Option 1)
        console.log("Boundary calculation complete:", {
            frames: validFrames.length,
            coordinates: {
                minX, maxX, minY, maxY,
                width: totalWidth,
                height: totalHeight
            },
            individualFrames: validFrames.map(f => ({
                id: f.id,
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
                right: f.x + f.width,
                bottom: f.y + f.height
            }))
        });
        
        // Preserve existing data attribute debug info
        this.boundaryMarquee.dataset.debug = JSON.stringify({
            frames: validFrames.length,
            minX, maxX, minY, maxY,
            width: totalWidth,
            height: totalHeight,
            timestamp: new Date().toISOString()
        });
    }

    addCollection() {
        console.log(`WallArtPlanner.addCollection() called. newCollection.count: ${this.newCollection.count}`, JSON.parse(JSON.stringify(this.newCollection)));
        const collection = new Collection({ ...this.newCollection }, this.wall, this); 
        const gridSize = this.gridSizeSelect ? Number(this.gridSizeSelect.value) : 0.5;
        
        collection.frames.forEach(frame => {
            frame.setGridSize(gridSize);
            if (frame.dragManager) frame.dragManager.setMinDistance(this.frameSpacing);
        });
        
        if(this.wallCanvas) collection.addToWall(this.wallCanvas);
        if (this.collectionsLegend) this.collectionsLegend.appendChild(collection.element);
        
        collection.element.addEventListener('collectionEmpty', () => {
            const index = this.collections.indexOf(collection);
            if (index > -1) {
                this.collections.splice(index, 1);
                if (this.boundaryMarquee) requestAnimationFrame(() => this.updateBoundaryMarquee());
                this.saveState();
            }
        });
        
        this.collections.push(collection);
        if (this.boundaryMarquee) {
             requestAnimationFrame(() => this.updateBoundaryMarquee());
        }
    }

    saveState() {
        console.log('Saving WallArtPlanner state...');
        try {
            // Verify no empty collections exist before saving
            const collectionsToSave = this.collections.filter(collection => 
                collection.frames && collection.frames.length > 0
            );
            
            // Create a clean version of the state
            const state = {
                wall: { ...this.wall },
                collections: collectionsToSave.map(collection => collection.serialize()),
                newCollection: { ...this.newCollection },
                gridSize: this.gridSizeSelect ? Number(this.gridSizeSelect.value) : 0.5,
                frameSpacing: this.frameSpacing,
                backgroundImageUrl: this.wallBackgroundImage && 
                                    this.wallBackgroundImage.style.display === 'block' ? 
                                    this.wallBackgroundImage.src : null
            };
            
            // Add metadata to help with debugging
            state.metadata = {
                timestamp: new Date().toISOString(),
                frameCount: collectionsToSave.reduce((total, c) => total + c.frames.length, 0),
                collectionCount: collectionsToSave.length,
                version: '1.0.0' // Add versioning for future migration support
            };
            
            localStorage.setItem('wallArtPlannerState', JSON.stringify(state));
            console.log('WallArtPlanner state saved:', state);
            
            return true;
        } catch (error) {
            console.error('Error saving WallArtPlanner state:', error);
            return false;
        }
    }
}
