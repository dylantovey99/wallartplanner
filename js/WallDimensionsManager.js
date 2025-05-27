class WallDimensionsManager {
    constructor(wall) {
        this.wall = wall;
        this.wallCanvas = document.getElementById('wallCanvas');
        this.wallWidthInput = document.getElementById('wallWidth');
        this.wallHeightInput = document.getElementById('wallHeight');
        this.wallWidthDisplay = document.querySelector('.wall-width-display');
        this.wallHeightDisplay = document.querySelector('.wall-height-display');
        
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        this.wallWidthInput.addEventListener('change', () => {
            this.wall.width = Number(this.wallWidthInput.value);
            this.updateDisplay();
            this.dispatchWallUpdate();
        });

        this.wallHeightInput.addEventListener('change', () => {
            this.wall.height = Number(this.wallHeightInput.value);
            this.updateDisplay();
            this.dispatchWallUpdate();
        });
    }

    updateDisplay() {
        // The wallCanvas itself should fill its container (.wall-section)
        // The aspect ratio and max-height are controlled by CSS.
        // We only set the input values and text displays here.
        this.wallWidthInput.value = this.wall.width;
        this.wallHeightInput.value = this.wall.height;
        this.wallWidthDisplay.textContent = `${formatMeasurement(this.wall.width)}`;
        this.wallHeightDisplay.textContent = `Height: ${formatMeasurement(this.wall.height)}`;
        
        // The actual visual scaling of frames will happen relative to the
        // wallCanvas's current dimensions, which are determined by CSS and its container.
        // The SCALE constant in utils.js is used by Frame.js to draw frames
        // at the correct size relative to the wall's inch dimensions.
    }

    dispatchWallUpdate() {
        this.wallCanvas.dispatchEvent(new CustomEvent('wallDimensionsChanged', {
            detail: { width: this.wall.width, height: this.wall.height }
        }));
    }

    getDimensions() {
        return { ...this.wall };
    }
}
