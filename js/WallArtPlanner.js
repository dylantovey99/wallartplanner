import { DEFAULT_WALL, SCALE, mmToInches, formatMeasurement, createElement, cmToInches } from './utils.js';
import Collection from './Collection.js';
import DeletionManager from './DeletionManager.js';

const BACKGROUND_IMAGE_FIXED_HEIGHT_METERS = 2.4;
const METERS_TO_INCHES = 39.3701;
const BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES = BACKGROUND_IMAGE_FIXED_HEIGHT_METERS * METERS_TO_INCHES;

export default class WallArtPlanner {
    constructor() {
        this.wall = { ...DEFAULT_WALL };
        // Wall dimensions are ALWAYS stored in inches; wallUnit only affects
        // how the width/height inputs and displays are presented ('in' | 'cm')
        this.wallUnit = 'in';
        // Live pixels-per-inch for the current canvas size. Frames, drag math and the
        // marquee all read this instead of the fixed SCALE constant so the rendering
        // stays correct when the canvas is clamped to its container or the viewport.
        this.scale = SCALE;
        this.collections = []; // Holds Collection objects, which hold Frame objects
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

        // Note: no 'storage' event listener. If two tabs are open, last writer wins;
        // the previous cross-tab "validation" destroyed saved frames because frame ids
        // were not serialized, and rewriting live DOM state from another tab is unsafe.

        // Re-fit the canvas (and re-scale all frames) when the viewport changes
        this._resizeHandler = () => {
            clearTimeout(this._resizeTimer);
            this._resizeTimer = setTimeout(() => this.updateWallDisplay(), 150);
        };
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('orientationchange', this._resizeHandler);
    }

    // Coalesce marquee updates so bursts of frameMove events cost one recompute per paint
    scheduleMarqueeUpdate() {
        if (!this.boundaryMarquee || this._marqueePending) return;
        this._marqueePending = true;
        requestAnimationFrame(() => {
            this._marqueePending = false;
            this.updateBoundaryMarquee();
        });
    }

    // Debounced save for high-frequency callers (drags fire frameMove per pointer event)
    saveStateDebounced(delay = 400) {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.saveState(), delay);
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
        this.wallUnitSelect = document.getElementById('wallUnits');
        this.removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
        this.printPresetSelect = document.getElementById('printPreset');
        this.swapOrientationButton = document.getElementById('swapOrientation');
        
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
        this.syncWallInputs();
        if (this.printWidthInput) this.printWidthInput.value = this.newCollection.printWidth;
        if (this.printHeightInput) this.printHeightInput.value = this.newCollection.printHeight;
        if (this.mattWidthInput) this.mattWidthInput.value = this.newCollection.mattWidth;
        if (this.frameWidthSelect) this.frameWidthSelect.value = "20"; 
        if (this.frameMaterialSelect) this.frameMaterialSelect.value = this.newCollection.frameMaterial;
        if (this.frameCountInput) this.frameCountInput.value = this.newCollection.count;
        if (this.frameSpacingSelect) this.frameSpacingSelect.value = String(this.frameSpacing);

        this.updateWallDisplay(); // Call initial display update
    }

    // --- Wall unit helpers (internal storage is ALWAYS inches) ---

    toDisplayUnit(inches) {
        return this.wallUnit === 'cm' ? inches * 2.54 : inches;
    }

    fromDisplayUnit(value) {
        return this.wallUnit === 'cm' ? cmToInches(value) : value;
    }

    formatWallMeasurement(inches) {
        return this.wallUnit === 'cm'
            ? `${(inches * 2.54).toFixed(1)}cm`
            : formatMeasurement(inches);
    }

    // Push the internal (inch) wall dimensions into the inputs in the display unit
    syncWallInputs() {
        const unitText = this.wallUnit === 'cm' ? 'cm' : 'inches';
        document.querySelectorAll('.wall-unit-label').forEach(el => el.textContent = unitText);
        if (this.wallUnitSelect) this.wallUnitSelect.value = this.wallUnit;

        const min = this.wallUnit === 'cm' ? 61 : 24;    // 24in ≈ 61cm
        const max = this.wallUnit === 'cm' ? 1524 : 600; // 600in = 1524cm
        [this.wallWidthInput, this.wallHeightInput].forEach(input => {
            if (input) {
                input.min = String(min);
                input.max = String(max);
            }
        });

        if (this.wallWidthInput) this.wallWidthInput.value = Number(this.toDisplayUnit(this.wall.width).toFixed(1));
        if (this.wallHeightInput) this.wallHeightInput.value = Number(this.toDisplayUnit(this.wall.height).toFixed(1));
    }

    setupEventListeners() {
        // Wall dimension changes (inputs are in the selected display unit)
        if (this.wallWidthInput) {
            this.wallWidthInput.addEventListener('change', () => {
                this.wall.width = this.fromDisplayUnit(Number(this.wallWidthInput.value));
                this.updateWallDisplay(); // This will call updateBoundaryMarquee
                this.saveState();
            });
        }
        if (this.wallHeightInput) {
            this.wallHeightInput.addEventListener('change', () => {
                this.wall.height = this.fromDisplayUnit(Number(this.wallHeightInput.value));
                this.updateWallDisplay(); // This will call updateBoundaryMarquee
                this.saveState();
            });
        }

        // Wall unit toggle: converts the displayed values, not the stored inches
        if (this.wallUnitSelect) {
            this.wallUnitSelect.addEventListener('change', () => {
                this.wallUnit = this.wallUnitSelect.value === 'cm' ? 'cm' : 'in';
                this.syncWallInputs();
                this.updateWallDisplay();
                this.saveState();
            });
        }

        // Remove background image without destroying the layout
        if (this.removeBackgroundBtn) {
            this.removeBackgroundBtn.addEventListener('click', () => this.removeBackgroundImage());
        }

        // Common print size presets fill the width/height fields
        if (this.printPresetSelect) {
            this.printPresetSelect.addEventListener('change', (e) => {
                if (!e.target.value) return;
                const [w, h] = e.target.value.split('x').map(Number);
                if (!w || !h) return;
                if (this.printWidthInput) this.printWidthInput.value = w;
                if (this.printHeightInput) this.printHeightInput.value = h;
                this.newCollection.printWidth = w;
                this.newCollection.printHeight = h;
            });
        }

        // Portrait/landscape swap for the new-collection print size
        if (this.swapOrientationButton) {
            this.swapOrientationButton.addEventListener('click', () => {
                const w = this.printWidthInput ? Number(this.printWidthInput.value) : this.newCollection.printWidth;
                const h = this.printHeightInput ? Number(this.printHeightInput.value) : this.newCollection.printHeight;
                if (this.printWidthInput) this.printWidthInput.value = h;
                if (this.printHeightInput) this.printHeightInput.value = w;
                this.newCollection.printWidth = h;
                this.newCollection.printHeight = w;
                if (this.printPresetSelect) this.printPresetSelect.value = '';
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
                
                // It's crucial to check if the y-coordinate from the event detail matches what we expect
                // or if it has already changed to the cascaded value.

                this.scheduleMarqueeUpdate();
                // frameMove fires per pointer event during drags — debounce the save
                this.saveStateDebounced();
            });
            
            this.wallCanvas.addEventListener('frameUpdate', (event) => { 
                if (!event.target.classList.contains('frame') || !event.detail) return;
                this.saveState();
            });

            this.wallCanvas.addEventListener('frameDelete', (event) => {
                if (!event.target || !event.detail) return;
    
                const frameId = event.detail.frameId;
                const collectionId = event.detail.collectionId;
                
                
                // Use DeletionManager for reliable deletion
                if (collectionId) {
                    this.deletionManager.deleteFrame(frameId, collectionId);
                } else {
                    // Legacy fallback if collectionId not provided
                    // Find the frame in collections and delete it
                    this.collections.forEach(collection => {
                        const frame = collection.frames.find(f => f.id === frameId);
                        if (frame) {
                            this.deletionManager.deleteFrame(frameId, collection.id);
                        }
                    });
                    
                    // Update UI and save state
                    this.scheduleMarqueeUpdate();
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

                            this.syncWallInputs();
                            if(this.wallWidthInput) this.wallWidthInput.readOnly = true;
                            if(this.wallHeightInput) this.wallHeightInput.readOnly = true;
                            if(this.wallBackgroundImage) {
                                this.wallBackgroundImage.src = e.target.result;
                                this.wallBackgroundImage.style.display = 'block';
                            }
                            if(this.removeBackgroundBtn) this.removeBackgroundBtn.style.display = 'inline-block';
                            this.updateWallDisplay();
                            this.saveState();
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                } else {
                    this.removeBackgroundImage();
                }
            });
        }
        
        // New collection input listeners (manual edits reset the preset to Custom)
        if(this.printWidthInput) this.printWidthInput.addEventListener('input', (e) => {
            this.newCollection.printWidth = Number(e.target.value);
            if (e.isTrusted && this.printPresetSelect) this.printPresetSelect.value = '';
        });
        if(this.printHeightInput) this.printHeightInput.addEventListener('input', (e) => {
            this.newCollection.printHeight = Number(e.target.value);
            if (e.isTrusted && this.printPresetSelect) this.printPresetSelect.value = '';
        });
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

    // Clear the wall photo and unlock the wall dimension inputs.
    // Previously the only way out of a background upload was "Delete All Frames".
    removeBackgroundImage() {
        if (this.wallBackgroundImage) {
            this.wallBackgroundImage.removeAttribute('src');
            this.wallBackgroundImage.style.display = 'none';
        }
        if (this.backgroundImageUpload) this.backgroundImageUpload.value = '';
        if (this.wallWidthInput) this.wallWidthInput.readOnly = false;
        if (this.wallHeightInput) this.wallHeightInput.readOnly = false;
        if (this.removeBackgroundBtn) this.removeBackgroundBtn.style.display = 'none';
        this.saveState();
    }

    loadSavedState() {
        const savedState = localStorage.getItem('wallArtPlannerState');
        if (!savedState) {
            this.wall = { ...DEFAULT_WALL }; // Use new 80x80 default
            this.syncWallInputs();
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
            
            if (state.wallUnit === 'cm' || state.wallUnit === 'in') {
                this.wallUnit = state.wallUnit;
            }
            this.syncWallInputs();

            // Only accept data: image URLs from storage (guards against injected values)
            const savedBackground = typeof state.backgroundImageUrl === 'string' &&
                state.backgroundImageUrl.startsWith('data:image/') ? state.backgroundImageUrl : null;
            if (savedBackground && this.wallBackgroundImage) {
                this.wallBackgroundImage.src = savedBackground;
                this.wallBackgroundImage.style.display = 'block';
                if(this.wallWidthInput) this.wallWidthInput.readOnly = true;
                if(this.wallHeightInput) this.wallHeightInput.readOnly = true;
                if(this.removeBackgroundBtn) this.removeBackgroundBtn.style.display = 'inline-block';
            } else if (this.wallBackgroundImage) {
                this.wallBackgroundImage.removeAttribute('src');
                this.wallBackgroundImage.style.display = 'none';
                if(this.wallWidthInput) this.wallWidthInput.readOnly = false;
                if(this.wallHeightInput) this.wallHeightInput.readOnly = false;
                if(this.removeBackgroundBtn) this.removeBackgroundBtn.style.display = 'none';
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

            if (state.collections) {
                state.collections.forEach(collectionData => {
                    const collection = new Collection(collectionData, this.wall, this); 
                    collection.addToWall(this.wallCanvas);
                    if (this.collectionsLegend) this.collectionsLegend.appendChild(collection.element);
                    
                    collection.element.addEventListener('collectionEmpty', () => {
                        const index = this.collections.indexOf(collection);
                        if (index > -1) {
                            this.collections.splice(index, 1);
                            this.scheduleMarqueeUpdate();
                            this.saveState();
                        }
                    });
                    this.collections.push(collection);
                });

                // Re-apply grid snapping and minimum spacing to restored frames
                // (their drag managers start with defaults, not the saved settings)
                const gridSize = this.gridSizeSelect ? Number(this.gridSizeSelect.value) : 0.5;
                this.updateGridSize(gridSize);
                this.updateFrameSpacing(this.frameSpacing);
            }
            this.updateWallDisplay();

        } catch (error) {
            // Never destroy the user's saved layout because restore failed —
            // keep a backup so the data is recoverable, and start with a clean wall.
            console.error('Error loading saved state (state preserved in wallArtPlannerState_backup):', error);
            try {
                localStorage.setItem('wallArtPlannerState_backup', savedState);
            } catch (backupError) {
                console.error('Could not back up saved state:', backupError);
            }
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
        // Max height tracks the viewport so tall walls fit on small screens
        const maxHeightForCanvas = Math.max(300, Math.min(900, window.innerHeight * 0.75));

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

        // Derive the live pixels-per-inch from the fitted canvas and re-scale
        // every frame so on-screen geometry always matches the wall's inches
        const previousScale = this.scale;
        this.scale = (this.wall.width > 0 && displayPixelWidth > 0)
            ? displayPixelWidth / this.wall.width
            : SCALE;
        if (Math.abs(this.scale - previousScale) > 1e-9) {
            this.rerenderFrames();
        }

        this.wallWidthDisplay.textContent = this.formatWallMeasurement(this.wall.width);
        this.wallHeightDisplay.textContent = `Height: ${this.formatWallMeasurement(this.wall.height)}`;

        this.scheduleMarqueeUpdate();
    }

    // Re-apply pixel sizes/positions to all frames after the scale changes
    rerenderFrames() {
        this.collections.forEach(collection => {
            collection.frames.forEach(frame => frame.applyScale());
        });
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
        
        // Detailed frame data logging (kept from previous version)
        liveFramesData.forEach((frame, index) => {
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

        const scale = this.scale || SCALE;
        this.boundaryMarquee.style.display = 'block';
        this.boundaryMarquee.style.transform = `translate(${minX * scale}px, ${minY * scale}px)`;
        this.boundaryMarquee.style.width = `${totalWidth * scale}px`;
        this.boundaryMarquee.style.height = `${totalHeight * scale}px`;
        
        const dimensionElement = this.boundaryMarquee.querySelector('.boundary-dimension');
        if (dimensionElement) {
            dimensionElement.textContent = 
                `${formatMeasurement(totalWidth)} × ${formatMeasurement(totalHeight)}`;
        }
        
        // Add detailed debug info (NEW PART from Option 1)
        
    }

    addCollection() {
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
                this.scheduleMarqueeUpdate();
                this.saveState();
            }
        });

        this.collections.push(collection);
        this.scheduleMarqueeUpdate();
    }

    saveState() {
        try {
            // Verify no empty collections exist before saving
            const collectionsToSave = this.collections.filter(collection => 
                collection.frames && collection.frames.length > 0
            );
            
            // Create a clean version of the state
            const state = {
                wall: { ...this.wall },
                wallUnit: this.wallUnit,
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
            this.hideStorageWarning();

            return true;
        } catch (error) {
            // Most likely QuotaExceededError: images (background + frame photos) are large.
            // Retry without image data so at least the layout survives, and tell the user.
            console.error('Error saving WallArtPlanner state:', error);
            try {
                const slimState = {
                    wall: { ...this.wall },
                    collections: this.collections
                        .filter(c => c.frames && c.frames.length > 0)
                        .map(c => {
                            const data = c.serialize();
                            data.frames = data.frames.map(f => ({ ...f, thumbnailImage: null }));
                            return data;
                        }),
                    newCollection: { ...this.newCollection },
                    gridSize: this.gridSizeSelect ? Number(this.gridSizeSelect.value) : 0.5,
                    frameSpacing: this.frameSpacing,
                    backgroundImageUrl: null
                };
                localStorage.setItem('wallArtPlannerState', JSON.stringify(slimState));
                this.showStorageWarning('Your layout was saved, but the uploaded photos could not be — browser storage is full. They will not reappear after a reload.');
            } catch (retryError) {
                console.error('Retry save without images also failed:', retryError);
                this.showStorageWarning('Your layout could not be saved — browser storage is full. Changes will be lost when you close this page.');
            }
            return false;
        }
    }

    showStorageWarning(message) {
        let warning = document.getElementById('storageWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'storageWarning';
            warning.className = 'storage-warning';
            warning.setAttribute('role', 'alert');
            const text = document.createElement('span');
            text.className = 'storage-warning-text';
            const dismiss = document.createElement('button');
            dismiss.type = 'button';
            dismiss.className = 'storage-warning-dismiss';
            dismiss.setAttribute('aria-label', 'Dismiss warning');
            dismiss.textContent = '×';
            dismiss.addEventListener('click', () => warning.remove());
            warning.appendChild(text);
            warning.appendChild(dismiss);
            document.body.prepend(warning);
        }
        warning.querySelector('.storage-warning-text').textContent = message;
    }

    hideStorageWarning() {
        const warning = document.getElementById('storageWarning');
        if (warning) warning.remove();
    }
}
