import { SCALE, formatMeasurement, createElement, cmToInches } from './utils.js';
import FrameDragManager from './FrameDragManager.js';

export default class Frame {
    static nextId = 1;

    constructor(data, position, color, wallDimensions, frameMaterial = 'black', planner) { // Added planner argument
        this.id = Frame.nextId++;
        this.planner = planner; // Store planner instance
        console.log(`Creating frame ${this.id} with material ${frameMaterial}`, `Planner:`, planner);

        // Store exact values without rounding
        this.printWidth = Number(data.printWidth); // Expected in inches
        this.printHeight = Number(data.printHeight); // Expected in inches
        
        // data.mattWidth is expected in CENTIMETERS from Collection.js
        this.mattWidthCm = Number(data.mattWidth); 
        this.mattWidth = cmToInches(this.mattWidthCm); // Convert CM to INCHES for internal use

        this.frameWidth = Number(data.frameWidth); // Expected in inches
        this.x = Number(position.x);
        this.y = Number(position.y);
        this.color = color; // This is for the print area color / collection color
        this.frameMaterial = frameMaterial;

        // Calculate total dimensions including mat and frame with exact precision (using internal inch values)
        this.width = this.printWidth + (2 * this.mattWidth) + (2 * this.frameWidth);
        this.height = this.printHeight + (2 * this.mattWidth) + (2 * this.frameWidth);

        // Add validation and detailed logging
        this.validateDimensions();

        console.log(`Frame ${this.id} dimensions:`, {
            position: { x: this.x, y: this.y },
            dimensions: {
                width: this.width, // inches
                height: this.height // inches
            },
            details: {
                printWidth: this.printWidth, // inches
                printHeight: this.printHeight, // inches
                mattWidthCm: this.mattWidthCm, // cm
                mattWidthInches: this.mattWidth, // inches
                frameWidth: this.frameWidth // inches
            }
        });

        this.element = this.createFrameElement();
        // Pass planner to FrameDragManager constructor
        this.dragManager = new FrameDragManager(this, wallDimensions, this.planner); 
        this.setupEventListeners();

        // Initial position update and event dispatch
        requestAnimationFrame(() => {
            this.updatePosition();
        });
    }

    // Add this new method to validate dimensions
    validateDimensions() {
        // Check for NaN or invalid values
        const dimensionProps = ['printWidth', 'printHeight', 'mattWidth', 'frameWidth', 'width', 'height', 'x', 'y'];
        const invalid = dimensionProps.filter(prop => isNaN(this[prop]) || this[prop] === undefined);
        
        if (invalid.length > 0) {
            console.error(`Frame ${this.id} has invalid dimensions:`, invalid);
            // Set defaults for invalid properties to prevent calculation errors
            invalid.forEach(prop => {
                if (isNaN(this[prop]) || this[prop] === undefined) {
                    this[prop] = 0;
                    console.warn(`Set invalid property ${prop} to 0`);
                }
            });
        }
        
        // Verify total width/height calculation
        const expectedWidth = this.printWidth + (2 * this.mattWidth) + (2 * this.frameWidth);
        const expectedHeight = this.printHeight + (2 * this.mattWidth) + (2 * this.frameWidth);
        
        if (Math.abs(this.width - expectedWidth) > 0.001 || Math.abs(this.height - expectedHeight) > 0.001) {
            console.error(`Frame ${this.id} dimension mismatch:`, {
                calculated: { width: this.width, height: this.height },
                expected: { width: expectedWidth, height: expectedHeight }
            });
            
            // Fix the dimensions
            this.width = expectedWidth;
            this.height = expectedHeight;
        }
        
        console.log(`Frame ${this.id} validated dimensions:`, {
            components: {
                printWidth: this.printWidth,
                printHeight: this.printHeight,
                mattWidth: this.mattWidth,
                frameWidth: this.frameWidth
            },
            total: {
                width: this.width,
                height: this.height
            },
            position: {
                x: this.x,
                y: this.y
            }
        });
    }

    createFrameElement() {
        const element = createElement(`
            <div class="frame">
                <div class="frame-dimensions">
                    ${formatMeasurement(this.width)} × ${formatMeasurement(this.height)}
                </div>
                <div class="frame-controls">
                    <button class="delete-btn">×</button>
                    <button class="frame-info-btn" title="View frame details">?</button>
                    <button class="photo-upload-btn" title="Upload image">📷</button>
                </div>
                <div class="frame-layers">
                    <div class="frame-outer"></div>
                    <div class="frame-matt"></div>
                    <div class="frame-print"></div>
                </div>
                <div class="distance-indicators">
                    <div class="distance-left"></div>
                    <div class="distance-right"></div>
                    <div class="distance-top"></div>
                    <div class="distance-bottom"></div>
                </div>
                <div class="spacing-indicator">
                    <div class="spacing-value"></div>
                </div>
                <input type="file" class="photo-upload-input" accept="image/*" style="display: none;">
            </div>
        `);

        // Set exact dimensions in pixels
        element.style.width = `${this.width * SCALE}px`;
        element.style.height = `${this.height * SCALE}px`;

        // Calculate inset values for matt and print
        const frameInset = `${this.frameWidth * SCALE}px`;
        const mattInset = `${(this.frameWidth + this.mattWidth) * SCALE}px`;

        // Set dimensions for frame layers
        const frameLayers = element.querySelector('.frame-layers');
        frameLayers.style.position = 'absolute';
        frameLayers.style.inset = '0';

        // Style frame (outer border)
        const frameOuter = element.querySelector('.frame-outer');
        frameOuter.style.position = 'absolute';
        frameOuter.style.inset = '0';
        // Apply frame material color
        switch (this.frameMaterial) {
            case 'black':
                frameOuter.style.backgroundColor = '#111111';
                break;
            case 'white':
                frameOuter.style.backgroundColor = '#FAFAFA';
                break;
            case 'oak':
                frameOuter.style.backgroundColor = '#D2B48C'; // Tan
                break;
            case 'walnut':
                frameOuter.style.backgroundColor = '#7B3F00'; // Dark brown
                break;
            default:
                frameOuter.style.backgroundColor = '#333'; // Default
        }

        // Style matt (white area)
        const frameMatt = element.querySelector('.frame-matt');
        frameMatt.style.position = 'absolute';
        frameMatt.style.inset = frameInset;
        frameMatt.style.backgroundColor = '#fff';

        // Style print area (random color)
        const framePrint = element.querySelector('.frame-print');
        framePrint.style.position = 'absolute';
        framePrint.style.inset = mattInset;
        framePrint.style.backgroundColor = this.color;

        // Store exact dimensions and position as data attributes
        element.dataset.id = String(this.id);
        element.dataset.width = String(this.width);
        element.dataset.height = String(this.height);
        element.dataset.x = String(this.x);
        element.dataset.y = String(this.y);

        return element;
    }

    setupEventListeners() {
        this.dragManager.setupDragListeners();

        const deleteBtn = this.element.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`Deleting frame ${this.id}`);
            this.element.dispatchEvent(new CustomEvent('frameDelete', { bubbles: true }));
        });

        const infoBtn = this.element.querySelector('.frame-info-btn');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showFrameInfo();
        });

        // Photo upload button
        const photoBtn = this.element.querySelector('.photo-upload-btn');
        const photoInput = this.element.querySelector('.photo-upload-input');

        photoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            photoInput.click();
        });

        photoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
    }

    handleImageUpload(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.openImageCropper(img);
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    openImageCropper(img) {
        // Create modal for image cropping
        const modal = document.createElement('div');
        modal.className = 'modal image-crop-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content image-crop-content';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';

        const title = document.createElement('h3');
        title.className = 'modal-title';
        title.textContent = 'Crop Image';

        const subtitle = document.createElement('p');
        subtitle.textContent = `Crop image to fit print size: ${formatMeasurement(this.printWidth)} × ${formatMeasurement(this.printHeight)}`;

        // Create controls for zoom
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'crop-controls';

        const zoomLabel = document.createElement('label');
        zoomLabel.textContent = 'Zoom:';
        zoomLabel.htmlFor = 'zoom-slider';

        const zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.id = 'zoom-slider';
        zoomSlider.min = '100';
        zoomSlider.max = '300';
        zoomSlider.value = '100';

        const zoomValue = document.createElement('span');
        zoomValue.className = 'zoom-value';
        zoomValue.textContent = '100%';

        controlsContainer.appendChild(zoomLabel);
        controlsContainer.appendChild(zoomSlider);
        controlsContainer.appendChild(zoomValue);

        const cropContainer = document.createElement('div');
        cropContainer.className = 'crop-container';

        // Create a wrapper for the canvas and crop overlay
        const cropWrapper = document.createElement('div');
        cropWrapper.className = 'crop-wrapper';

        const canvas = document.createElement('canvas');
        canvas.className = 'crop-canvas';

        // Removed creation of separate cropBoundary div
        // The cropWrapper will now serve as the visual boundary

        cropWrapper.appendChild(canvas);
        // Removed appending cropBoundary
        cropContainer.appendChild(cropWrapper);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = 'Save';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = 'Cancel';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(subtitle);
        modalContent.appendChild(controlsContainer);
        modalContent.appendChild(cropContainer);
        modalContent.appendChild(buttonContainer);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Set up canvas for cropping
        const ctx = canvas.getContext('2d');

        // Calculate aspect ratio of the print
        const printAspectRatio = this.printWidth / this.printHeight;

        // Set canvas size based on available space (max 80% of viewport)
        const maxWidth = window.innerWidth * 0.7;
        const maxHeight = window.innerHeight * 0.5;

        // Simplified and corrected canvas sizing logic
        let targetWidth = maxWidth;
        let targetHeight = targetWidth / printAspectRatio;

        if (targetHeight > maxHeight) { // If height exceeds max, calculate based on max height instead
            targetHeight = maxHeight;
            targetWidth = targetHeight * printAspectRatio;
        }
        // targetWidth and targetHeight now hold the correctly constrained dimensions

        canvas.width = targetWidth;  // Set drawing surface width
        canvas.height = targetHeight; // Set drawing surface height
        // canvas.style.width = `${targetWidth}px`;  // Remove explicit CSS width
        // canvas.style.height = `${targetHeight}px`; // Remove explicit CSS height

        // Ensure wrapper size is set explicitly (as it now has the border)
        cropWrapper.style.width = `${targetWidth}px`;  // Use targetWidth
        cropWrapper.style.height = `${targetHeight}px`; // Use targetHeight

        // Removed setting container width explicitly
        // cropContainer.style.width = `${targetWidth}px`;

        // Removed setting dimensions for cropBoundary

        // Calculate scaling to fit image in canvas while maintaining aspect ratio
        const imgAspectRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        let scale = 1;

        function updateImageDisplay() {
            // Calculate dimensions based on current scale
            if (imgAspectRatio > printAspectRatio) {
                // Image is wider than print area
                drawHeight = targetHeight * scale; // Use targetHeight
                drawWidth = drawHeight * imgAspectRatio;
            } else {
                // Image is taller than print area
                drawWidth = targetWidth * scale; // Use targetWidth
                drawHeight = drawWidth / imgAspectRatio;
            }

            /* Removed initial centering logic - constraints should handle it
            // Center the image if it's smaller than the canvas
            if (offsetX === 0 && drawWidth < canvasWidth) {
                offsetX = (canvasWidth - drawWidth) / 2;
            }
            if (offsetY === 0 && drawHeight < canvasHeight) {
                offsetY = (canvasHeight - drawHeight) / 2;
            }
            */

            // Corrected: Constrain offsets to keep image edges outside or aligned with the canvas boundary
            // The image's top-left corner (offsetX, offsetY) cannot be > 0
            // The image's bottom-right corner (offsetX + drawWidth, offsetY + drawHeight) cannot be < canvas dimensions
            const minOffsetX = targetWidth - drawWidth; // Use targetWidth, will be <= 0
            const maxOffsetX = 0;
            const minOffsetY = targetHeight - drawHeight; // Use targetHeight, will be <= 0
            const maxOffsetY = 0;

            // Clamp offsets, ensuring min <= max (handle cases where image is smaller than canvas)
            offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
            offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));

            // Draw image on canvas
            ctx.clearRect(0, 0, targetWidth, targetHeight); // Use targetWidth/Height
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Initial draw
        updateImageDisplay();

        // Variables for dragging image
        let isDraggingImage = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let startOffsetX = 0;
        let startOffsetY = 0;

        // Handle zoom slider change
        zoomSlider.addEventListener('input', (e) => {
            scale = parseInt(e.target.value) / 100;
            zoomValue.textContent = `${e.target.value}%`;

            // Adjust offsets to zoom from center
            const centerX = targetWidth / 2; // Use targetWidth
            const centerY = targetHeight / 2; // Use targetHeight

            // Calculate new offsets to keep the center point fixed
            const oldDrawWidth = drawWidth;
            const oldDrawHeight = drawHeight;

            // Update image with new scale
            updateImageDisplay();

            // Adjust offsets to zoom from center
            const scaleChange = drawWidth / oldDrawWidth;
            const centerOffsetX = centerX - (offsetX + oldDrawWidth / 2);
            const centerOffsetY = centerY - (offsetY + oldDrawHeight / 2);

            offsetX -= centerOffsetX * (scaleChange - 1);
            offsetY -= centerOffsetY * (scaleChange - 1);
            
            updateImageDisplay();
        });
        
        // Add event listeners for dragging image
        canvas.addEventListener('mousedown', (e) => {
            isDraggingImage = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            startOffsetX = offsetX;
            startOffsetY = offsetY;
            e.preventDefault();
        });

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            isDraggingImage = true;
            const touch = e.touches[0];
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            startOffsetX = offsetX;
            startOffsetY = offsetY;
            e.preventDefault(); // Prevent scrolling page
        });

        // Handle move for dragging image (both mouse and touch)
        const handleImageMove = (clientX, clientY) => {
             if (isDraggingImage) {
                const dx = clientX - dragStartX;
                const dy = clientY - dragStartY;

                offsetX = startOffsetX + dx;
                offsetY = startOffsetY + dy;

                updateImageDisplay();
            }
        };

        const handleImageMoveMouse = (e) => {
            handleImageMove(e.clientX, e.clientY);
        };

        const handleImageMoveTouch = (e) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            handleImageMove(touch.clientX, touch.clientY);
            e.preventDefault(); // Prevent scrolling page
        };

        // Handle end of drag (both mouse and touch)
        const handleImageEnd = () => {
            isDraggingImage = false;
        };

        // Add move/end listeners to the document to catch events outside the canvas
        document.addEventListener('mousemove', handleImageMoveMouse);
        document.addEventListener('mouseup', handleImageEnd);
        document.addEventListener('touchmove', handleImageMoveTouch, { passive: false });
        document.addEventListener('touchend', handleImageEnd);
        document.addEventListener('touchcancel', handleImageEnd); // Handle cancellation

        // Function to remove all image drag listeners
        const removeImageDragListeners = () => {
            document.removeEventListener('mousemove', handleImageMoveMouse);
            document.removeEventListener('mouseup', handleImageEnd);
            document.removeEventListener('touchmove', handleImageMoveTouch);
            document.removeEventListener('touchend', handleImageEnd);
            document.removeEventListener('touchcancel', handleImageEnd);
        };

        // Handle save button click
        saveBtn.addEventListener('click', () => {
            // Create a new canvas for the cropped image
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = 600; // Use a reasonable size for the thumbnail
            croppedCanvas.height = 600 / printAspectRatio;
            
            const croppedCtx = croppedCanvas.getContext('2d');
            
            // Draw the entire canvas to the new canvas (since crop boundary is fixed)
            croppedCtx.drawImage(
                canvas, 
                0, 0, targetWidth, targetHeight, // Use targetWidth/Height
                0, 0, croppedCanvas.width, croppedCanvas.height
            );

            // Get the data URL of the cropped image
            const croppedImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.85);
            
            // Apply the cropped image to the frame
            this.applyThumbnailImage(croppedImageUrl);

            // Clean up event listeners
            removeImageDragListeners();

            // Close the modal
            modal.remove();
        });
        
        // Handle cancel and close button clicks
        cancelBtn.addEventListener('click', () => {
            // Clean up event listeners
            removeImageDragListeners();
            modal.remove();
        });

        closeBtn.addEventListener('click', () => {
            // Clean up event listeners
            removeImageDragListeners();
            modal.remove();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Clean up event listeners
                removeImageDragListeners();
                modal.remove();
            }
        });
    }
    
    applyThumbnailImage(imageUrl) {
        const framePrint = this.element.querySelector('.frame-print');
        
        // Store the image URL
        this.thumbnailImage = imageUrl;
        
        // Apply the image to the frame print area
        framePrint.style.backgroundImage = `url(${imageUrl})`;
        framePrint.style.backgroundSize = 'cover';
        framePrint.style.backgroundPosition = 'center';
        framePrint.style.backgroundColor = 'transparent';
        
        // Dispatch event to notify that the frame has been updated
        this.element.dispatchEvent(new CustomEvent('frameUpdate', {
            bubbles: true,
            detail: {
                id: this.id,
                thumbnailImage: imageUrl
            }
        }));
    }

    showFrameInfo() {
        const modal = document.getElementById('frameInfoModal');
        const closeBtn = modal.querySelector('.modal-close');
        
        modal.querySelector('.print-size').textContent = 
            `${formatMeasurement(this.printWidth)} × ${formatMeasurement(this.printHeight)}`;
        
        // Use the original matt width in cm
        modal.querySelector('.matt-width').textContent = 
            `${this.mattWidthCm.toFixed(1)}cm`;
        
        modal.querySelector('.frame-width').textContent = 
            `${Math.round(this.frameWidth * 25.4)}mm (${formatMeasurement(this.frameWidth)})`;
        modal.querySelector('.total-size').textContent = 
            `${formatMeasurement(this.width)} × ${formatMeasurement(this.height)}`;

        modal.style.display = 'block';

        const closeModal = () => {
            modal.style.display = 'none';
            closeBtn.removeEventListener('click', closeModal);
            window.removeEventListener('click', windowClick);
        };

        const windowClick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };

        closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', windowClick);
    }

    setGridSize(size) {
        this.dragManager.setGridSize(size);
    }

    dispatchFrameMoveEvent() {
        const eventDetail = {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            printWidth: this.printWidth,
            printHeight: this.printHeight,
            mattWidth: this.mattWidth,
            frameWidth: this.frameWidth
        };

        console.log(`Frame ${this.id} dispatching frameMove event:`, eventDetail);

        // Update data attributes first
        this.element.dataset.x = String(this.x);
        this.element.dataset.y = String(this.y);
        this.element.dataset.width = String(this.width);
        this.element.dataset.height = String(this.height);

        // Then dispatch event
        this.element.dispatchEvent(new CustomEvent('frameMove', {
            bubbles: true,
            detail: eventDetail
        }));
    }

    updatePosition() {
        // Set exact position in pixels
        const transformX = this.x * SCALE;
        const transformY = this.y * SCALE;
        
        console.log(`Frame ${this.id} updatePosition CALLED: current this.x=${this.x}, this.y=${this.y}. Applying transform: translate(${transformX}px, ${transformY}px)`);

        this.element.style.transform = `translate(${transformX}px, ${transformY}px)`;
        
        // Update spacing indicator
        this.updateSpacingIndicator();
        
        // Dispatch frameMove event with exact dimensions
        this.dispatchFrameMoveEvent();
    }
    
    updateSpacingIndicator() {
        // Get the current frame spacing from the UI
        const frameSpacingSelect = document.getElementById('frameSpacing');
        if (!frameSpacingSelect) return;
        
        const spacing = Number(frameSpacingSelect.value);
        const spacingIndicator = this.element.querySelector('.spacing-indicator');
        const spacingValue = this.element.querySelector('.spacing-value');
        
        if (spacingIndicator && spacingValue) {
            // Only show spacing indicator when the frame is being dragged
            if (this.element.classList.contains('dragging')) {
                spacingIndicator.style.display = 'block';
                
                // Set the size of the spacing indicator to visualize the minimum distance
                const spacingPx = spacing * SCALE;
                spacingIndicator.style.top = `-${spacingPx}px`;
                spacingIndicator.style.right = `-${spacingPx}px`;
                spacingIndicator.style.bottom = `-${spacingPx}px`;
                spacingIndicator.style.left = `-${spacingPx}px`;
                
                // Update the spacing value text
                spacingValue.textContent = `${spacing}" spacing`;
            } else {
                spacingIndicator.style.display = 'none';
            }
        }
    }

    remove() {
        console.log(`Frame ${this.id} remove() called.`);
    
        try {
            // Dispatch event for data cleanup in parent classes
            this.element.dispatchEvent(new CustomEvent('frameDelete', {
                bubbles: true,
                detail: { 
                    frameId: this.id,
                    collectionId: this.collection?.id  // Reference to parent collection
                }
            }));
            
            // Only remove DOM element if still attached
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
                console.log(`Frame ${this.id} DOM element removed.`);
            }
            
            // Nullify references to assist garbage collection
            this.dragManager = null;
            this.element = null;
        } catch (error) {
            console.error(`Error removing frame ${this.id}:`, error);
        }
    }

    addBoundaryIndicator() {
        console.log(`Adding boundary indicator to frame ${this.id}`);
        
        // Remove existing one if any
        const existingIndicator = this.element.querySelector('.frame-boundary-indicator');
        if (existingIndicator) existingIndicator.remove();

        const boundaryElement = document.createElement('div');
        boundaryElement.className = 'frame-boundary-indicator';
        
        Object.assign(boundaryElement.style, {
            position: 'absolute',
            inset: '0',
            border: '2px dashed red',
            pointerEvents: 'none',
            zIndex: '9990', // Ensure it's above frame content but below other UI
            boxSizing: 'border-box'
        });
        
        const sizeLabel = document.createElement('div');
        sizeLabel.className = 'boundary-size-label';
        Object.assign(sizeLabel.style, {
            position: 'absolute',
            bottom: '-20px',
            left: '0px',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 4px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            border: '1px solid #ccc',
            borderRadius: '3px'
        });
        
        const expectedWidth = this.printWidth + (2 * this.mattWidth) + (2 * this.frameWidth);
        const expectedHeight = this.printHeight + (2 * this.mattWidth) + (2 * this.frameWidth);
        const actualWidth = this.width;
        const actualHeight = this.height;
        
        const widthMatch = Math.abs(expectedWidth - actualWidth) < 0.01;
        const heightMatch = Math.abs(expectedHeight - actualHeight) < 0.01;
        
        sizeLabel.textContent = `Calc: ${expectedWidth.toFixed(2)}" × ${expectedHeight.toFixed(2)}"`;
        sizeLabel.style.color = (widthMatch && heightMatch) ? 'green' : 'red';
        
        boundaryElement.appendChild(sizeLabel);

        if (!widthMatch || !heightMatch) {
            const actualLabel = document.createElement('div');
            actualLabel.className = 'actual-size-label';
            Object.assign(actualLabel.style, {
                position: 'absolute',
                bottom: '-38px', // Position below the calculated label
                left: '0px',
                background: 'rgba(255,255,255,0.85)',
                padding: '2px 4px',
                fontSize: '10px',
                color: 'blue',
                border: '1px solid #ccc',
                borderRadius: '3px',
                whiteSpace: 'nowrap'
            });
            actualLabel.textContent = `Actual: ${actualWidth.toFixed(2)}" × ${actualHeight.toFixed(2)}"`;
            boundaryElement.appendChild(actualLabel);
        }
        
        const measureLabel = document.createElement('div');
        measureLabel.className = 'measured-size-label';
        Object.assign(measureLabel.style, {
            position: 'absolute',
            top: '-20px',
            right: '0px',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 4px',
            fontSize: '10px',
            border: '1px solid #ccc',
            borderRadius: '3px',
            whiteSpace: 'nowrap'
        });
        
        const renderedWidth = this.element.offsetWidth / SCALE;
        const renderedHeight = this.element.offsetHeight / SCALE;
        
        measureLabel.textContent = `Rendered: ${renderedWidth.toFixed(2)}" × ${renderedHeight.toFixed(2)}"`;
        measureLabel.style.color = (Math.abs(renderedWidth - expectedWidth) < 0.01 && 
                                   Math.abs(renderedHeight - expectedHeight) < 0.01) ? 'green' : 'orange';
        
        boundaryElement.appendChild(measureLabel);
        this.element.appendChild(boundaryElement);
        return boundaryElement;
    }

    addComponentIndicators() {
        console.log(`Adding component indicators to frame ${this.id}`);

        // Remove existing one if any
        const existingIndicators = this.element.querySelector('.component-indicators');
        if (existingIndicators) existingIndicators.remove();
        
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.className = 'component-indicators';
        Object.assign(indicatorsContainer.style, {
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '9991' // Above boundary indicator
        });
        
        const printIndicator = document.createElement('div');
        printIndicator.className = 'print-indicator';
        Object.assign(printIndicator.style, {
            position: 'absolute',
            inset: `${(this.frameWidth + this.mattWidth) * SCALE}px`,
            border: '1px dotted blue',
            boxSizing: 'border-box'
        });
        
        const matIndicator = document.createElement('div');
        matIndicator.className = 'mat-indicator';
        Object.assign(matIndicator.style, {
            position: 'absolute',
            inset: `${this.frameWidth * SCALE}px`,
            border: '1px dotted green',
            boxSizing: 'border-box'
        });
        
        const createLabel = (text, top, left, right, bottom, color = 'black') => {
            const label = document.createElement('div');
            Object.assign(label.style, {
                position: 'absolute',
                background: 'rgba(255,255,255,0.85)',
                padding: '1px 3px',
                fontSize: '9px',
                border: '1px solid #ddd',
                borderRadius: '2px',
                color: color,
                whiteSpace: 'nowrap'
            });
            if (top !== undefined) label.style.top = top;
            if (left !== undefined) label.style.left = left;
            if (right !== undefined) label.style.right = right;
            if (bottom !== undefined) label.style.bottom = bottom;
            label.textContent = text;
            return label;
        };

        const printLabel = createLabel(`Print: ${this.printWidth}" × ${this.printHeight}"`, '2px', '2px', undefined, undefined, 'blue');
        printIndicator.appendChild(printLabel);
        
        const matLabel = createLabel(`Mat: ${this.mattWidth.toFixed(2)}" (${(this.mattWidthCm).toFixed(1)}cm)`, '2px', undefined, '2px', undefined, 'green');
        matIndicator.appendChild(matLabel);
        
        const frameLabel = createLabel(`Frame: ${this.frameWidth}" (${Math.round(this.frameWidth * 25.4)}mm)`, undefined, '2px', undefined, '2px', 'red');
        // This label is attached to the main indicatorsContainer as it represents the outermost frame part
        indicatorsContainer.appendChild(frameLabel);
        
        indicatorsContainer.appendChild(matIndicator); // Mat is on top of frame part
        indicatorsContainer.appendChild(printIndicator); // Print is on top of mat
        
        this.element.appendChild(indicatorsContainer);
        return indicatorsContainer;
    }
}
