import { SCALE } from './utils.js';

export default class BoundaryTester {
    constructor(wallArtPlanner) {
        this.wallArtPlanner = wallArtPlanner;
        this.measurementMode = false;
        this.startPoint = null;
        this.measureLine = null;
        this.measureLabel = null;
        
        this.init();
    }
    
    init() {
        this.createDebugPanel();
        this.setupEventListeners();
    }
    
    createDebugPanel() {
        const debugPanelContainer = document.createElement('div');
        debugPanelContainer.className = 'debug-panel-container'; // Use a container for better styling if needed
        debugPanelContainer.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.2); font-family: sans-serif; font-size: 14px;">
                <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Boundary Testing</h3>
                <div style="margin-bottom: 5px;">
                    <label style="display: block; margin-bottom: 3px;">
                        <input type="checkbox" id="show-boundaries"> Show Frame Boundaries
                    </label>
                </div>
                <div style="margin-bottom: 5px;">
                    <label style="display: block; margin-bottom: 3px;">
                        <input type="checkbox" id="show-components"> Show Component Boundaries
                    </label>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 3px;">
                        <input type="checkbox" id="measurement-mode"> Measurement Mode
                    </label>
                </div>
                <div>
                    <button id="create-test-frames" style="padding: 5px 10px; font-size: 13px; cursor: pointer;">Create Test Frames</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(debugPanelContainer);

        // Add debug button to the panel
        const debugButtonContainer = document.createElement('div');
        debugButtonContainer.style.marginTop = '10px';
        debugButtonContainer.innerHTML = `
            <button id="debug-boundaries" style="padding: 5px 10px; font-size: 13px; cursor: pointer; background-color: #ffcc00; color: black;">
                Debug Boundaries
            </button>
        `;
        
        const existingPanelContent = debugPanelContainer.querySelector('div[style*="position: fixed"]');
        if (existingPanelContent) {
            existingPanelContent.appendChild(debugButtonContainer);
        } else {
            // Fallback if the specific div isn't found, though it should be
            debugPanelContainer.appendChild(debugButtonContainer);
        }
    }
    
    setupEventListeners() {
        document.getElementById('show-boundaries').addEventListener('change', (e) => {
            this.toggleBoundaries(e.target.checked);
        });
        
        document.getElementById('show-components').addEventListener('change', (e) => {
            this.toggleComponents(e.target.checked);
        });
        
        document.getElementById('measurement-mode').addEventListener('change', (e) => {
            this.toggleMeasurementMode(e.target.checked);
        });
        
        document.getElementById('create-test-frames').addEventListener('click', () => {
            this.createTestFrames();
        });

        // Add debug boundaries button listener
        const debugBoundariesBtn = document.getElementById('debug-boundaries');
        if (debugBoundariesBtn) {
            debugBoundariesBtn.addEventListener('click', () => {
                this.debugBoundaries();
            });
        }
    }

    debugBoundaries() {
        console.log("%c==== BOUNDARY DEBUG INFORMATION ====", "background: #ffcc00; color: black; font-size: 14px;");
        
        // Get all frames from WallArtPlanner
        const allFrames = this.wallArtPlanner.getAllFrameObjects();
        console.log(`Total frames: ${allFrames.length}`);
        
        // Log frame details
        allFrames.forEach((frame, index) => {
            console.log(`Frame ${index + 1}:`, {
                id: frame.id,
                position: { x: frame.x, y: frame.y },
                dimensions: { width: frame.width, height: frame.height },
                element: frame.element,
                computed: {
                    offsetWidth: frame.element ? frame.element.offsetWidth : 'N/A',
                    offsetHeight: frame.element ? frame.element.offsetHeight : 'N/A'
                }
            });
        });
        
        // Calculate boundary
        if (allFrames.length > 0) {
            const minX = Math.min(...allFrames.map(f => f.x));
            const maxX = Math.max(...allFrames.map(f => f.x + f.width));
            const minY = Math.min(...allFrames.map(f => f.y));
            const maxY = Math.max(...allFrames.map(f => f.y + f.height));
            
            console.log("Calculated boundary:", {
                minX, maxX, minY, maxY,
                width: maxX - minX,
                height: maxY - minY
            });
        }
        
        // Check for visual vs. data mismatches by comparing DOM positions
        if (allFrames.length > 0) {
            console.log("%c==== VISUAL VS DATA COMPARISON ====", "background: #ff9900; color: black; font-size: 14px;");
            
            allFrames.forEach((frame, index) => {
                if (frame.element) {
                    const rect = frame.element.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(frame.element);
                    const transform = computedStyle.transform;
                    
                    console.log(`Frame ${index + 1} (ID: ${frame.id}):`, {
                        dataPosition: { x: frame.x, y: frame.y },
                        visualPosition: { 
                            left: rect.left, 
                            top: rect.top,
                            transform
                        },
                        dataDimensions: { width: frame.width, height: frame.height },
                        visualDimensions: { width: rect.width / SCALE, height: rect.height / SCALE }
                    });
                }
            });
        }
    }
    
    toggleBoundaries(show) {
        document.querySelectorAll('.frame').forEach(frameEl => {
            const frameId = frameEl.dataset.id;
            const frame = this.getFrameById(frameId);
            
            if (frame) {
                if (show) {
                    if (!frameEl.querySelector('.frame-boundary-indicator')) {
                        frame.addBoundaryIndicator();
                    }
                } else {
                    const indicator = frameEl.querySelector('.frame-boundary-indicator');
                    if (indicator) indicator.remove();
                }
            }
        });
    }
    
    toggleComponents(show) {
        document.querySelectorAll('.frame').forEach(frameEl => {
            const frameId = frameEl.dataset.id;
            const frame = this.getFrameById(frameId);
            
            if (frame) {
                if (show) {
                    if (!frameEl.querySelector('.component-indicators')) {
                        frame.addComponentIndicators();
                    }
                } else {
                     const indicator = frameEl.querySelector('.component-indicators');
                    if (indicator) indicator.remove();
                }
            }
        });
    }
    
    toggleMeasurementMode(enable) {
        this.measurementMode = enable;
        const wall = document.querySelector('.wall-canvas');
        
        if (enable) {
            wall.addEventListener('mousedown', this.startMeasurementHandler = this.startMeasurement.bind(this));
            document.addEventListener('mousemove', this.updateMeasurementHandler = this.updateMeasurement.bind(this));
            document.addEventListener('mouseup', this.endMeasurementHandler = this.endMeasurement.bind(this));
            wall.style.cursor = 'crosshair';
        } else {
            wall.removeEventListener('mousedown', this.startMeasurementHandler);
            document.removeEventListener('mousemove', this.updateMeasurementHandler);
            document.removeEventListener('mouseup', this.endMeasurementHandler);
            wall.style.cursor = 'default';
            
            document.querySelectorAll('.measurement-line, .measurement-label').forEach(el => el.remove());
            this.measureLine = null; // Clear references
            this.measureLabel = null;
        }
    }
    
    startMeasurement(e) {
        if (!this.measurementMode || e.target.closest('.frame')) return; // Don't start if clicking on a frame
        
        const wall = document.querySelector('.wall-canvas');
        const rect = wall.getBoundingClientRect();
        
        this.startPoint = {
            x: (e.clientX - rect.left) / SCALE,
            y: (e.clientY - rect.top) / SCALE
        };
        
        if (this.measureLine) this.measureLine.remove();
        if (this.measureLabel) this.measureLabel.remove();
        
        this.measureLine = document.createElement('div');
        this.measureLine.className = 'measurement-line';
        Object.assign(this.measureLine.style, {
            position: 'absolute', background: 'red', height: '2px',
            transformOrigin: 'left center', zIndex: '10000', pointerEvents: 'none'
        });
        
        this.measureLabel = document.createElement('div');
        this.measureLabel.className = 'measurement-label';
        Object.assign(this.measureLabel.style, {
            position: 'absolute', background: 'white', border: '1px solid black',
            padding: '2px 5px', zIndex: '10001', fontSize: '12px', pointerEvents: 'none'
        });
        
        wall.appendChild(this.measureLine);
        wall.appendChild(this.measureLabel);
    }
    
    updateMeasurement(e) {
        if (!this.measurementMode || !this.startPoint || !this.measureLine) return;
        
        const wall = document.querySelector('.wall-canvas');
        const rect = wall.getBoundingClientRect();
        
        const endPoint = {
            x: (e.clientX - rect.left) / SCALE,
            y: (e.clientY - rect.top) / SCALE
        };
        
        const dx = endPoint.x - this.startPoint.x;
        const dy = endPoint.y - this.startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        this.measureLine.style.width = `${distance * SCALE}px`;
        this.measureLine.style.transform = `rotate(${angle}deg)`;
        this.measureLine.style.left = `${this.startPoint.x * SCALE}px`;
        this.measureLine.style.top = `${this.startPoint.y * SCALE}px`;
        
        this.measureLabel.textContent = `${distance.toFixed(2)}"`;
        this.measureLabel.style.left = `${(this.startPoint.x + dx / 2) * SCALE + 5}px`;
        this.measureLabel.style.top = `${(this.startPoint.y + dy / 2) * SCALE - 20}px`;
    }
    
    endMeasurement() {
        if (!this.measurementMode) return;
        // Keep the last measurement visible until a new one starts or mode is toggled off
        // this.startPoint = null; 
    }
    
    getFrameById(frameId) {
        for (const collection of this.wallArtPlanner.collections) {
            for (const frame of collection.frames) {
                if (frame.id.toString() === frameId) {
                    return frame;
                }
            }
        }
        return null;
    }
    
    createTestFrames() {
        const testCases = [
            { name: "Standard", printWidth: 8, printHeight: 10, mattWidthCm: 2 * 2.54, frameWidth: 1, position: { x: 5, y: 5 }, frameMaterial: 'black' },
            { name: "Small", printWidth: 1, printHeight: 1, mattWidthCm: 0.5 * 2.54, frameWidth: 0.25, position: { x: 25, y: 5 }, frameMaterial: 'white' },
            { name: "Large", printWidth: 24, printHeight: 36, mattWidthCm: 3 * 2.54, frameWidth: 2, position: { x: 5, y: 25 }, frameMaterial: 'oak' },
            { name: "Metric Mat", printWidth: 10, printHeight: 15, mattWidthCm: 2.5, frameWidth: 0.8, position: { x: 45, y: 25 }, frameMaterial: 'walnut' }
        ];
        
        if (confirm("This will clear the current layout and create test frames. Continue?")) {
            this.wallArtPlanner.clearAll(); // This should also clear existing test labels if they are children of wallCanvas
            document.querySelectorAll('.test-frame-label').forEach(el => el.remove()); // Explicitly clear old labels

            const originalNewCollection = { ...this.wallArtPlanner.newCollection }; // Backup current form settings

            testCases.forEach((testCase, index) => {
                // Temporarily set the planner's newCollection data to the current test case
                this.wallArtPlanner.newCollection = {
                    printWidth: testCase.printWidth,
                    printHeight: testCase.printHeight,
                    mattWidth: testCase.mattWidthCm, // This is in CM, as expected by WallArtPlanner's newCollection.mattWidth
                    frameWidth: testCase.frameWidth,  // This is in INCHES. WallArtPlanner.newCollection.frameWidth is also in inches.
                    count: 1, // Test cases are for single frames
                    color: this.getRandomTestColor(index), // For print area, not frame itself
                    frameMaterial: testCase.frameMaterial // For the frame material
                };
                
                // Call the planner's addCollection. It will use the `this.newCollection` we just set.
                // WallArtPlanner.addCollection() returns the created Collection instance.
                const createdPlannerCollection = this.wallArtPlanner.addCollection(); 

                if (createdPlannerCollection && createdPlannerCollection.frames.length > 0) {
                    const frame = createdPlannerCollection.frames[0]; // Get the actual Frame instance
                    frame.x = testCase.position.x;
                    frame.y = testCase.position.y;
                    frame.updatePosition(); // This ensures its position is set and events are dispatched
                    this.addTestLabelForFrame(frame, testCase.name);
                } else {
                    console.error("Failed to create collection or frame for test case:", testCase);
                }
            });

            this.wallArtPlanner.newCollection = originalNewCollection; // Restore original form settings

            // Re-apply toggles if they were active, so new frames get indicators
            if (document.getElementById('show-boundaries').checked) {
                this.toggleBoundaries(false); // Clear old ones if any
                this.toggleBoundaries(true);
            }
            if (document.getElementById('show-components').checked) {
                this.toggleComponents(false); // Clear old ones if any
                this.toggleComponents(true);
            }
        }
    }

    addTestLabelForFrame(frame, name) {
        const wall = document.querySelector('.wall-canvas');
        const labelElement = document.createElement('div');
        labelElement.className = 'test-frame-label';
        labelElement.textContent = `${name}: ${frame.printWidth}"x${frame.printHeight}"P, ${frame.mattWidth.toFixed(2)}"M, ${frame.frameWidth}"F`;
        Object.assign(labelElement.style, {
            position: 'absolute',
            left: `${frame.x * SCALE}px`,
            top: `${(frame.y - 1.5) * SCALE}px`, // Position above the frame
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 4px',
            border: '1px solid #555',
            zIndex: '9900', // Ensure it's above frames but below indicators
            fontSize: '10px',
            whiteSpace: 'nowrap'
        });
        wall.appendChild(labelElement);
    }
    
    getRandomTestColor(index) {
        const colors = ['#E74C3C', '#2ECC71', '#3498DB', '#F1C40F', '#9B59B6'];
        return colors[index % colors.length];
    }
}
