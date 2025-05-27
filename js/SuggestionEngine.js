import { formatMeasurement, cmToInches } from './utils.js';

export default class SuggestionEngine {
    constructor() {
        this.matchDimensionSelect = document.getElementById('matchDimension');
        this.printOrientationSelect = document.getElementById('printOrientation');
        this.aspectRatioSelect = document.getElementById('aspectRatio');
        this.customRatioDiv = document.getElementById('customRatioInputs');
        this.customRatioWidth = document.getElementById('customRatioWidth');
        this.customRatioHeight = document.getElementById('customRatioHeight');
        this.suggestionResult = document.getElementById('suggestionResult');
        this.getSuggestionButton = document.getElementById('getSuggestion');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.aspectRatioSelect.addEventListener('change', () => {
            this.customRatioDiv.classList.toggle('hidden', 
                this.aspectRatioSelect.value !== 'custom');
        });

        // Add event listener for custom ratio inputs
        [this.customRatioWidth, this.customRatioHeight].forEach(input => {
            input.addEventListener('input', () => {
                const width = Number(this.customRatioWidth.value);
                const height = Number(this.customRatioHeight.value);
                if (width > 0 && height > 0) {
                    this.aspectRatioSelect.value = width / height;
                }
            });
        });
    }

    calculateSuggestion(frames) {
        if (!frames || frames.length === 0) {
            throw new Error('Please add some frames first to get a suggestion');
        }

        // Calculate layout bounds
        const minX = Math.min(...frames.map(f => f.x || 0));
        const maxX = Math.max(...frames.map(f => (f.x || 0) + (f.width || 0)));
        const minY = Math.min(...frames.map(f => f.y || 0));
        const maxY = Math.max(...frames.map(f => (f.y || 0) + (f.height || 0)));

        const layoutWidth = maxX - minX;
        const layoutHeight = maxY - minY;

        if (layoutWidth <= 0 || layoutHeight <= 0) {
            throw new Error('Invalid frame layout. Please ensure frames are properly positioned.');
        }

        // Calculate matt width - either use existing frames' matt width or default to 5cm
        let mattWidth;
        const avgMattWidth = frames.reduce((sum, f) => sum + (f.mattWidth || 0), 0) / frames.length;
        if (!isNaN(avgMattWidth) && avgMattWidth > 0) {
            mattWidth = avgMattWidth; // Use average from existing frames
        } else {
            mattWidth = cmToInches(5); // Default to 5cm converted to inches
        }

        // Calculate average frame width
        const avgFrameWidth = frames.reduce((sum, f) => sum + (f.frameWidth || 0), 0) / frames.length;
        if (isNaN(avgFrameWidth)) {
            throw new Error('Invalid frame measurements. Please check frame properties.');
        }

        // Get desired aspect ratio
        const aspectRatio = this.getAspectRatio();
        const adjustedAspectRatio = this.adjustAspectRatio(aspectRatio, layoutWidth, layoutHeight);

        // Calculate suggested dimensions
        const { printWidth, printHeight } = this.calculateDimensions(
            layoutWidth, 
            layoutHeight, 
            adjustedAspectRatio, 
            mattWidth, 
            avgFrameWidth
        );

        return {
            printWidth,
            printHeight,
            mattWidth: mattWidth,
            frameWidth: avgFrameWidth
        };
    }

    getAspectRatio() {
        if (this.aspectRatioSelect.value === 'custom') {
            const widthRatio = Number(this.customRatioWidth.value) || 1;
            const heightRatio = Number(this.customRatioHeight.value) || 1;
            return widthRatio / heightRatio;
        }
        return Number(this.aspectRatioSelect.value);
    }

    adjustAspectRatio(aspectRatio, layoutWidth, layoutHeight) {
        const orientation = this.printOrientationSelect.value;
        const layoutRatio = layoutWidth / layoutHeight;
        const isLayoutLandscape = layoutRatio > 1;

        if (orientation === 'portrait' && aspectRatio > 1) {
            return 1 / aspectRatio;
        } else if (orientation === 'landscape' && aspectRatio < 1) {
            return 1 / aspectRatio;
        } else if (orientation === 'auto') {
            if (isLayoutLandscape && aspectRatio < 1) {
                return 1 / aspectRatio;
            } else if (!isLayoutLandscape && aspectRatio > 1) {
                return 1 / aspectRatio;
            }
        }
        return aspectRatio;
    }

    calculateDimensions(layoutWidth, layoutHeight, aspectRatio, mattWidth, frameWidth) {
        const matchDimension = this.matchDimensionSelect.value;
        let printWidth, printHeight;

        if (matchDimension === 'width') {
            printWidth = layoutWidth - (2 * mattWidth) - (2 * frameWidth);
            printHeight = printWidth / aspectRatio;
        } else {
            printHeight = layoutHeight - (2 * mattWidth) - (2 * frameWidth);
            printWidth = printHeight * aspectRatio;
        }

        // Round to nearest 0.5 inch
        return {
            printWidth: Math.round(printWidth * 2) / 2,
            printHeight: Math.round(printHeight * 2) / 2
        };
    }

    updateSuggestionUI(suggestion) {
        const totalWidth = suggestion.printWidth + (suggestion.mattWidth * 2) + (suggestion.frameWidth * 2);
        const totalHeight = suggestion.printHeight + (suggestion.mattWidth * 2) + (suggestion.frameWidth * 2);

        // Remove both classes that might hide the element
        this.suggestionResult.classList.remove('hidden');
        this.suggestionResult.style.display = 'block';

        this.suggestionResult.querySelector('.print-size').textContent = 
            `${formatMeasurement(suggestion.printWidth)} × ${formatMeasurement(suggestion.printHeight)}`;
        this.suggestionResult.querySelector('.matt-width').textContent =
            `${(suggestion.mattWidth * 2.54).toFixed(1)}cm`;
        this.suggestionResult.querySelector('.frame-width').textContent = 
            `${Math.round(suggestion.frameWidth * 25.4)}mm (${formatMeasurement(suggestion.frameWidth)})`;
        this.suggestionResult.querySelector('.total-size').textContent = 
            `${formatMeasurement(totalWidth)} × ${formatMeasurement(totalHeight)}`;
    }

    hideSuggestionUI() {
        // Add both classes to ensure the element is hidden
        this.suggestionResult.classList.add('hidden');
        this.suggestionResult.style.display = 'none';
    }
}
