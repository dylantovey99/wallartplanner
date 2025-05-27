class StateManager {
    constructor(wallDimensionsManager) {
        this.wallDimensionsManager = wallDimensionsManager;
        this.collections = [];
        this.gridSizeSelect = document.getElementById('gridSize');
        this.frameSpacingSelect = document.getElementById('frameSpacing');
        this.currentFrameSpacing = this.frameSpacingSelect ? Number(this.frameSpacingSelect.value) : 1; // Default to 1 inch
    }

    saveState() {
        const state = {
            wall: this.wallDimensionsManager.getDimensions(),
            collections: this.collections.map(collection => collection.serialize()),
            gridSize: Number(this.gridSizeSelect.value),
            frameSpacing: this.currentFrameSpacing // Save current frame spacing
        };
        localStorage.setItem('wallArtPlannerState', JSON.stringify(state));
    }

    loadState(wallCanvas, collectionsLegend) {
        const savedState = localStorage.getItem('wallArtPlannerState');
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);
            this.applyState(state, wallCanvas, collectionsLegend);
        } catch (error) {
            console.error('Error loading saved state:', error);
        }
    }

    applyState(state, wallCanvas, collectionsLegend) {
        // Restore wall dimensions
        if (state.wall) {
            Object.assign(this.wallDimensionsManager.wall, state.wall);
            this.wallDimensionsManager.updateDisplay();
        }

        // Restore grid size
        if (state.gridSize) {
            this.gridSizeSelect.value = state.gridSize;
        }

        // Restore frame spacing
        if (state.frameSpacing !== undefined) {
            this.currentFrameSpacing = Number(state.frameSpacing);
            if (this.frameSpacingSelect) {
                this.frameSpacingSelect.value = this.currentFrameSpacing;
            }
        }

        // Restore collections
        if (state.collections) {
            state.collections.forEach(collectionData => {
                const collection = new Collection(
                    collectionData, 
                    this.wallDimensionsManager.getDimensions()
                );
                collection.addToWall(wallCanvas);
                collectionsLegend.appendChild(collection.element);
                
                collection.element.addEventListener('collectionEmpty', () => {
                    this.handleCollectionEmpty(collection);
                });

                // Apply current frame spacing to frames in the loaded collection
                collection.frames.forEach(frame => {
                    if (frame.dragManager) {
                        frame.dragManager.setMinDistance(this.currentFrameSpacing);
                    }
                });
                
                this.collections.push(collection);
            });
        }
    }

    handleCollectionEmpty(collection) {
        const index = this.collections.indexOf(collection);
        if (index > -1) {
            this.collections.splice(index, 1);
            collection.remove();
            this.saveState();
        }
    }

    addCollection(collection, wallCanvas, collectionsLegend) {
        collection.addToWall(wallCanvas);
        collectionsLegend.appendChild(collection.element);
        
        collection.element.addEventListener('collectionEmpty', () => {
            this.handleCollectionEmpty(collection);
        });

        // Apply current frame spacing to frames in the new collection
        collection.frames.forEach(frame => {
            if (frame.dragManager) {
                frame.dragManager.setMinDistance(this.currentFrameSpacing);
            }
        });
        
        this.collections.push(collection);
        this.saveState();
    }

    updateFrameSpacing(spacing) {
        this.currentFrameSpacing = Number(spacing);
        if (this.frameSpacingSelect) { // Update the UI select if it exists
            this.frameSpacingSelect.value = this.currentFrameSpacing;
        }
        this.collections.forEach(collection => {
            collection.frames.forEach(frame => {
                if (frame.dragManager) {
                    frame.dragManager.setMinDistance(this.currentFrameSpacing);
                }
                // Optionally, trigger a visual update or re-check for frames if needed
                // frame.updatePosition(); // This might be too much, but consider if spacing indicator needs update
            });
        });
        this.saveState();
    }

    updateGridSize(size) {
        this.collections.forEach(collection => {
            collection.frames.forEach(frame => {
                frame.setGridSize(size);
                // Snap current position to new grid
                frame.x = Math.round(frame.x / size) * size;
                frame.y = Math.round(frame.y / size) * size;
                frame.updatePosition();
            });
        });
        this.saveState();
    }

    getAllFrames() {
        return this.collections.flatMap(collection => 
            collection.frames.map(frame => ({
                x: frame.x,
                y: frame.y,
                width: frame.width,
                height: frame.height,
                mattWidth: frame.mattWidth,
                frameWidth: frame.frameWidth
            }))
        );
    }
}
