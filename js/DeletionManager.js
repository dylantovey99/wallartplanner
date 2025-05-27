// DeletionManager.js
export default class DeletionManager {
    constructor(planner) {
        this.planner = planner;
    }

    // Single frame deletion with transaction-like behavior
    deleteFrame(frameId, collectionId) {
        console.log(`DeletionManager: Deleting frame ${frameId} from collection ${collectionId}`);
        
        try {
            // 1. Find the frame and collection
            const collection = this.planner.collections.find(c => c.id === collectionId);
            if (!collection) {
                console.error(`Collection ${collectionId} not found for frame ${frameId}`);
                return false;
            }
            
            const frame = collection.frames.find(f => f.id === frameId);
            if (!frame) {
                console.error(`Frame ${frameId} not found in collection ${collectionId}`);
                return false;
            }
            
            // 2. Remove from DOM
            if (frame.element && frame.element.parentNode) {
                frame.element.parentNode.removeChild(frame.element);
            }
            
            // 3. Remove from collection's frames array
            const frameIndex = collection.frames.indexOf(frame);
            if (frameIndex > -1) {
                collection.frames.splice(frameIndex, 1);
            }
            
            // 4. Remove from planner's frameDetails Map
            this.planner.frameDetails.delete(frame.element);
            
            // 5. Check if collection is now empty
            if (collection.frames.length === 0) {
                this.deleteCollection(collectionId, false); // Don't save state yet
            }
            
            // 6. Update UI
            collection.updateLegendCount();
            requestAnimationFrame(() => this.planner.updateBoundaryMarquee());
            
            // 7. Save state to localStorage
            this.planner.saveState();
            
            // 8. Verify deletion success
            this.verifyDeletion(frameId);
            
            return true;
        } catch (error) {
            console.error(`Error deleting frame ${frameId}:`, error);
            // Force state save to recover
            this.planner.saveState();
            return false;
        }
    }
    
    // Collection deletion
    deleteCollection(collectionId, saveState = true) {
        console.log(`DeletionManager: Deleting collection ${collectionId}`);
        
        try {
            const collection = this.planner.collections.find(c => c.id === collectionId);
            if (!collection) {
                console.error(`Collection ${collectionId} not found`);
                return false;
            }
            
            // 1. Remove all frames' DOM elements
            collection.frames.forEach(frame => {
                if (frame.element && frame.element.parentNode) {
                    frame.element.parentNode.removeChild(frame.element);
                }
                this.planner.frameDetails.delete(frame.element);
            });
            
            // 2. Remove collection from planner's collections array
            const index = this.planner.collections.indexOf(collection);
            if (index > -1) {
                this.planner.collections.splice(index, 1);
            }
            
            // 3. Remove collection element from DOM
            if (collection.element && collection.element.parentNode) {
                collection.element.parentNode.removeChild(collection.element);
            }
            
            // 4. Update UI
            requestAnimationFrame(() => this.planner.updateBoundaryMarquee());
            
            // 5. Save state if requested
            if (saveState) {
                this.planner.saveState();
            }
            
            return true;
        } catch (error) {
            console.error(`Error deleting collection ${collectionId}:`, error);
            // Force state save to recover
            this.planner.saveState();
            return false;
        }
    }
    
    // Delete all frames and collections
    deleteAll(includeBackgroundImage = true) {
        console.log("DeletionManager: Deleting all frames and collections");
        
        try {
            // 1. Remove all frame DOM elements
            document.querySelectorAll('.frame').forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            
            // 2. Remove all collection DOM elements
            document.querySelectorAll('.collection-item').forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            
            // 3. Clear planner's collections array
            this.planner.collections = [];
            
            // 4. Clear planner's frameDetails Map
            this.planner.frameDetails.clear();
            
            // 5. Reset background image if requested
            if (includeBackgroundImage && this.planner.wallBackgroundImage) {
                this.planner.wallBackgroundImage.src = '#';
                this.planner.wallBackgroundImage.style.display = 'none';
                if (this.planner.wallWidthInput) this.planner.wallWidthInput.readOnly = false;
                if (this.planner.wallHeightInput) this.planner.wallHeightInput.readOnly = false;
            }
            
            // 6. Update UI
            if (this.planner.collectionsLegend) {
                this.planner.collectionsLegend.innerHTML = '';
            }
            
            requestAnimationFrame(() => this.planner.updateBoundaryMarquee());
            
            // 7. Save state to localStorage
            this.planner.saveState();
            
            // 8. Verify deletion success
            this.verifyAllDeleted();
            
            return true;
        } catch (error) {
            console.error("Error deleting all frames:", error);
            // Force state save to recover
            this.planner.saveState();
            return false;
        }
    }
    
    // Verification methods
    verifyDeletion(frameId) {
        // Verify frame is completely gone from all data structures
        const frameStillExists = this.planner.collections.some(collection => 
            collection.frames.some(frame => frame.id === frameId)
        );
        
        if (frameStillExists) {
            console.error(`Verification failed: Frame ${frameId} still exists after deletion`);
            // Force complete cleanup as fallback
            this.planner.collections.forEach(collection => {
                collection.frames = collection.frames.filter(frame => frame.id !== frameId);
            });
            this.planner.saveState();
        }
    }
    
    verifyAllDeleted() {
        const framesStillExist = document.querySelectorAll('.frame').length > 0;
        const collectionsStillExist = document.querySelectorAll('.collection-item').length > 0;
        
        if (framesStillExist || collectionsStillExist) {
            console.error("Verification failed: DOM elements still exist after deletion");
            // Force DOM cleanup
            document.querySelectorAll('.frame').forEach(el => el.remove());
            document.querySelectorAll('.collection-item').forEach(el => el.remove());
        }
    }
}
