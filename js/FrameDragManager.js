import { SCALE } from './utils.js';

const EPSILON = 0.001; // For floating point comparisons

export default class FrameDragManager {
    constructor(frame, wallDimensions, planner) { // Added planner argument
        this.frame = frame;
        this.wallDimensions = wallDimensions;
        this.planner = planner; // Store planner instance
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.originalPosition = { x: 0, y: 0 }; // To revert on failed push
        this.gridSize = 0.5; // Default grid size
        this.minDistance = 1; // Default minimum distance between frames in inches

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        console.log(`FrameDragManager initialized for frame ${this.frame.id}`, `Planner:`, planner);
    }
    
    isWithinBounds(x, y, width, height) {
        const maxX = this.wallDimensions.width - width;
        const maxY = this.wallDimensions.height - height;
        return x >= -EPSILON && x <= maxX + EPSILON &&
               y >= -EPSILON && y <= maxY + EPSILON;
    }

    setupDragListeners() {
        // Mouse events
        this.frame.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        // Touch events
        this.frame.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false }); // Use passive: false to allow preventDefault
    }

    _startDrag(clientX, clientY) {
        const rect = this.frame.element.getBoundingClientRect();
        this.isDragging = true;
        this.dragStart = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        this.originalPosition = { x: this.frame.x, y: this.frame.y }; // Store position at drag start

        console.log(`Frame ${this.frame.id} drag started at:`, this.dragStart, `Original pos:`, this.originalPosition);

        this.frame.element.classList.add('dragging');

        // Add listeners for both mouse and touch move/end
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        document.addEventListener('touchcancel', this.handleTouchEnd); // Handle cancellation
    }

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only handle left mouse button
        if (e.target.closest('.frame-controls')) return;
        e.preventDefault(); // Prevent default text selection, etc.
        this._startDrag(e.clientX, e.clientY);
    }

    handleTouchStart(e) {
        if (e.touches.length !== 1) return; // Only handle single touch
        if (e.target.closest('.frame-controls')) return;
        e.preventDefault(); // Crucial to prevent scrolling/zooming on touch devices
        const touch = e.touches[0];
        this._startDrag(touch.clientX, touch.clientY);
    }

    snapToGrid(value) {
        if (this.gridSize === 0) {
            // console.log(`Frame ${this.frame.id} no snapping (grid size: 0), value: ${value.toFixed(2)}`);
            return value; // No snapping if gridSize is 0
        }
        const snapped = Math.round(value / this.gridSize) * this.gridSize;
        // console.log(`Frame ${this.frame.id} snapping ${value.toFixed(2)} to ${snapped.toFixed(2)} (grid size: ${this.gridSize})`);
        return snapped;
    }

    highlightCollision(currentFrameEl, otherFrameEl) {
        if (currentFrameEl) currentFrameEl.classList.add('frame-collision-blocked');
        if (otherFrameEl) otherFrameEl.classList.add('frame-collision-blocked');
        
        // Optional: Clear after a short delay if you want the highlight to be temporary
        // setTimeout(() => this.clearCollisionHighlights(currentFrameEl, otherFrameEl), 500);
    }

    clearCollisionHighlights(currentFrameEl = null, otherFrameEl = null) {
        if (currentFrameEl) {
            currentFrameEl.classList.remove('frame-collision-blocked');
        }
        if (otherFrameEl) {
            otherFrameEl.classList.remove('frame-collision-blocked');
        }
        // If no specific elements are passed, clear from all frames (e.g., on drag end)
        if (!currentFrameEl && !otherFrameEl) {
            document.querySelectorAll('.frame.frame-collision-blocked').forEach(el => {
                el.classList.remove('frame-collision-blocked');
            });
        }
    }
    
    checkCollision(x, y, currentFrameId, otherFrames) {
        let collidingFrame = null;
        let minPushX = 0;
        let minPushY = 0;
        let hasCollision = false;

        for (const otherFrame of otherFrames) {
            if (otherFrame.id === currentFrameId) continue;

            const dx = (x + this.frame.width / 2) - (otherFrame.x + otherFrame.width / 2);
            const dy = (y + this.frame.height / 2) - (otherFrame.y + otherFrame.height / 2);

            const combinedHalfWidths = (this.frame.width + otherFrame.width) / 2 + this.minDistance;
            const combinedHalfHeights = (this.frame.height + otherFrame.height) / 2 + this.minDistance;

            if (Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights) {
                hasCollision = true;
                collidingFrame = otherFrame; // Store the frame we are colliding with

                const overlapX = combinedHalfWidths - Math.abs(dx);
                const overlapY = combinedHalfHeights - Math.abs(dy);
                
                let pushX = 0;
                let pushY = 0;

                // Determine push direction based on which axis has less overlap (or if only one axis overlaps significantly)
                // This logic prioritizes resolving the axis with the smallest *absolute* push needed.
                if (overlapX < overlapY) {
                    pushX = (dx > 0 ? overlapX : -overlapX);
                } else if (overlapY < overlapX) {
                    pushY = (dy > 0 ? overlapY : -overlapY);
                } else { // Equal overlap, or one is zero (e.g. corner touch)
                    // If overlaps are equal, push on both. If one is near zero, prioritize the other.
                    // This can be refined, but for now, let's push on the one that's not zero, or both if equal.
                    if (Math.abs(overlapX) > EPSILON) pushX = (dx > 0 ? overlapX : -overlapX);
                    if (Math.abs(overlapY) > EPSILON) pushY = (dy > 0 ? overlapY : -overlapY);
                }
                
                // Accumulate minimum push if multiple collisions (though we usually handle one at a time)
                // For simplicity, we'll focus on the first detected collision's push for now.
                // A more robust system might find the "best" push among all collisions.
                minPushX = pushX; 
                minPushY = pushY;
                
                // console.log(`Frame ${this.frame.id} collision with ${otherFrame.id}. OverlapX: ${overlapX.toFixed(2)}, OverlapY: ${overlapY.toFixed(2)}. Push: X=${pushX.toFixed(2)}, Y=${pushY.toFixed(2)}`);
                break; // Handle one collision at a time for now
            }
        }
        return { collides: hasCollision, pushX: minPushX, pushY: minPushY, collidingFrame };
    }


    _moveFrame(clientX, clientY) {
        if (!this.isDragging) return;
        this.clearCollisionHighlights(); // Clear previous highlights

        const wall = document.querySelector('.wall-canvas'); // TODO: Cache this if possible
        if (!wall) {
            console.error("Wall canvas element not found in _moveFrame.");
            return;
        }
        const wallRect = wall.getBoundingClientRect();

        let newX = (clientX - wallRect.left - this.dragStart.x) / SCALE;
        let newY = (clientY - wallRect.top - this.dragStart.y) / SCALE;
        
        console.log(`FDM _moveFrame (Frame ${this.frame.id}): Raw newX=${newX.toFixed(2)}, newY=${newY.toFixed(2)}`);

        let snappedX = this.snapToGrid(newX);
        let snappedY = this.snapToGrid(newY);
        
        console.log(`FDM _moveFrame (Frame ${this.frame.id}): Snapped snappedX=${snappedX.toFixed(2)}, snappedY=${snappedY.toFixed(2)}`);

        // Initial boundary check for the snapped position
        if (!this.isWithinBounds(snappedX, snappedY, this.frame.width, this.frame.height)) {
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): Snapped position OUT OF BOUNDS. Clamping.`);
            const maxX = this.wallDimensions.width - this.frame.width;
            const maxY = this.wallDimensions.height - this.frame.height;
            snappedX = Math.max(0, Math.min(snappedX, maxX));
            snappedY = Math.max(0, Math.min(snappedY, maxY));
            // Re-snap after clamping, in case clamping moved it off-grid (if gridSize > 0)
            snappedX = this.snapToGrid(snappedX);
            snappedY = this.snapToGrid(snappedY);
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): Clamped and re-snapped: snappedX=${snappedX.toFixed(2)}, snappedY=${snappedY.toFixed(2)}`);
        }
        
        // Get other frames using planner's live data
        const otherFrames = this.planner ? this.planner.getAllFrameObjects().filter(f => f.id !== String(this.frame.id)) : [];
        const collisionResult = this.checkCollision(snappedX, snappedY, String(this.frame.id), otherFrames);
        
        console.log(`FDM _moveFrame (Frame ${this.frame.id}): Collision check with (snappedX=${snappedX.toFixed(2)}, snappedY=${snappedY.toFixed(2)}). Result: collides=${collisionResult.collides}, pushX=${collisionResult.pushX.toFixed(2)}, pushY=${collisionResult.pushY.toFixed(2)}`);

        if (collisionResult.collides) {
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): Collision detected. Original pos before push attempt: x=${this.originalPosition.x.toFixed(2)}, y=${this.originalPosition.y.toFixed(2)}`);
            // Attempt to push the frame
            let pushedX = snappedX + collisionResult.pushX;
            let pushedY = snappedY + collisionResult.pushY;
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): Attempting push to: pushedX=${pushedX.toFixed(2)}, pushedY=${pushedY.toFixed(2)} (before snap)`);

            // Snap the pushed position
            pushedX = this.snapToGrid(pushedX);
            pushedY = this.snapToGrid(pushedY);
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): Pushed and snapped to: pushedX=${pushedX.toFixed(2)}, pushedY=${pushedY.toFixed(2)}`);

            // Check if pushed position is valid (within bounds and no new collisions)
            if (this.isWithinBounds(pushedX, pushedY, this.frame.width, this.frame.height)) {
                console.log(`FDM _moveFrame (Frame ${this.frame.id}): Pushed position IS WITHIN BOUNDS.`);
                const newCollision = this.checkCollision(pushedX, pushedY, String(this.frame.id), otherFrames);
                console.log(`FDM _moveFrame (Frame ${this.frame.id}): Collision check for pushed pos. Result: collides=${newCollision.collides}`);
                if (!newCollision.collides) {
                    // Pushed position is valid
                    console.log(`FDM _moveFrame (Frame ${this.frame.id}): Pushed position is VALID (no new collision). Setting frame to x=${pushedX.toFixed(2)}, y=${pushedY.toFixed(2)}`);
                    this.frame.x = pushedX;
                    this.frame.y = pushedY;
                } else {
                    // Pushed position still collides, revert to original position for this interval
                    console.log(`FDM _moveFrame (Frame ${this.frame.id}): Pushed position STILL COLLIDES. Reverting to originalPosition: x=${this.originalPosition.x.toFixed(2)}, y=${this.originalPosition.y.toFixed(2)}`);
                    this.frame.x = this.originalPosition.x;
                    this.frame.y = this.originalPosition.y;
                    this.highlightCollision(this.frame.element, collisionResult.collidingFrame.element);
                }
            } else {
                // Pushed position is out of bounds, revert
                console.log(`FDM _moveFrame (Frame ${this.frame.id}): Pushed position OUT OF BOUNDS. Reverting to originalPosition: x=${this.originalPosition.x.toFixed(2)}, y=${this.originalPosition.y.toFixed(2)}`);
                this.frame.x = this.originalPosition.x;
                this.frame.y = this.originalPosition.y;
                this.highlightCollision(this.frame.element, collisionResult.collidingFrame.element);
            }
        } else {
            // No collision, move to snapped position
            console.log(`FDM _moveFrame (Frame ${this.frame.id}): NO COLLISION. Setting frame to snapped: x=${snappedX.toFixed(2)}, y=${snappedY.toFixed(2)}`);
            this.frame.x = snappedX;
            this.frame.y = snappedY;
        }
        
        console.log(`FDM _moveFrame (Frame ${this.frame.id}): Final frame pos before updatePosition: x=${this.frame.x.toFixed(2)}, y=${this.frame.y.toFixed(2)}`);
        this.frame.updatePosition();
        this.originalPosition = { x: this.frame.x, y: this.frame.y }; // Update original for next interval
        console.log(`FDM _moveFrame (Frame ${this.frame.id}): Updated originalPosition for next interval: x=${this.originalPosition.x.toFixed(2)}, y=${this.originalPosition.y.toFixed(2)}`);
    }

    handleMouseMove(e) {
        // Store current mouse/touch position for the next interval's originalPosition
        // This is now handled inside _moveFrame by updating this.originalPosition
        this._moveFrame(e.clientX, e.clientY);
    }

    handleTouchMove(e) {
        if (e.touches.length !== 1) return; // Only handle single touch
        e.preventDefault(); // Prevent scrolling during drag
        const touch = e.touches[0];
        // Store current mouse/touch position for the next interval's originalPosition
        this._moveFrame(touch.clientX, touch.clientY);
    }

    _endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.frame.element.classList.remove('dragging');
            this.clearCollisionHighlights(); // Clear any remaining highlights

            // Remove all listeners
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
            document.removeEventListener('touchmove', this.handleTouchMove);
            document.removeEventListener('touchend', this.handleTouchEnd);
            document.removeEventListener('touchcancel', this.handleTouchEnd);

            // Final snap, though _moveFrame should keep it snapped
            const finalX = this.snapToGrid(this.frame.x);
            const finalY = this.snapToGrid(this.frame.y);
            
            if (Math.abs(finalX - this.frame.x) > EPSILON || Math.abs(finalY - this.frame.y) > EPSILON) {
                // console.log(`Frame ${this.frame.id} snapping to final position on drag end:`, {
                //     x: finalX.toFixed(2),
                //     y: finalY.toFixed(2)
                // });
                this.frame.x = finalX;
                this.frame.y = finalY;
                this.frame.updatePosition(); // This will also dispatch frameMove and save state via WallArtPlanner
            } else {
                // If no change in position, still ensure frameMove is dispatched for state saving
                this.frame.dispatchFrameMoveEvent();
            }


            // console.log(`Frame ${this.frame.id} drag ended at:`, {
            //     x: this.frame.x.toFixed(2),
            //     y: this.frame.y.toFixed(2)
            // });
        }
    }

    handleMouseUp() {
        this._endDrag();
    }

    handleTouchEnd() {
        this._endDrag();
    }

    setGridSize(size) {
        const prevGridSize = this.gridSize;
        const newGridSize = Number(size);

        // Allow gridSize to be 0 (no snapping)
        // If input is invalid (NaN, negative), default to previous or 0.5 if prev was also invalid.
        if (isNaN(newGridSize) || newGridSize < 0) {
            this.gridSize = (prevGridSize > 0) ? prevGridSize : 0.5;
            console.warn(`Invalid grid size input ${size}, reverting to ${this.gridSize}`);
        } else {
            this.gridSize = newGridSize;
        }
        
        // console.log(`Frame ${this.frame.id} grid size changing from ${prevGridSize} to ${this.gridSize} (input was ${size})`);
        
        if (this.frame) { // Snap current position to new grid if gridSize is not 0
            const snappedX = this.snapToGrid(this.frame.x);
            const snappedY = this.snapToGrid(this.frame.y);
            
            if (Math.abs(snappedX - this.frame.x) > EPSILON || Math.abs(snappedY - this.frame.y) > EPSILON) {
                // console.log(`Frame ${this.frame.id} snapping to new grid:`, {
                //     x: snappedX.toFixed(2),
                //     y: snappedY.toFixed(2)
                // });
                this.frame.x = snappedX;
                this.frame.y = snappedY;
                this.frame.updatePosition();
            }
        }
    }
    
    setMinDistance(distance) {
        const prevMinDistance = this.minDistance;
        const newDist = Number(distance);
        // Ensure minDistance is always positive. If input results in 0, NaN, or negative, default to 1.
        this.minDistance = (newDist > 0) ? newDist : 1; 
        console.log(`Frame ${this.frame.id} minimum distance changing from ${prevMinDistance} to ${this.minDistance} (input was ${distance}, processed to ${newDist})`);
    }
}
