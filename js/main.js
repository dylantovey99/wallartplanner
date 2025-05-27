import PriceCalculator from './PriceCalculator.js';
import WallArtPlanner from './WallArtPlanner.js';
import SuggestionEngine from './SuggestionEngine.js';
// import { formatMeasurement } from './utils.js'; // formatMeasurement is not directly used in this file.

// Initialize the Wall Art Planner
document.addEventListener('DOMContentLoaded', () => {
    // Initialize hide icons and hide all functionality
    const hideIconsCheckbox = document.getElementById('hideIcons');
    const hideAllCheckbox = document.getElementById('hideAll');
    const wallCanvas = document.getElementById('wallCanvas');
    
    if (hideIconsCheckbox && wallCanvas) {
        hideIconsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                wallCanvas.classList.add('hide-icons');
                if (hideAllCheckbox && hideAllCheckbox.checked) {
                    hideAllCheckbox.checked = false;
                    wallCanvas.classList.remove('hide-all');
                }
            } else {
                wallCanvas.classList.remove('hide-icons');
            }
        });
    }
    
    if (hideAllCheckbox && wallCanvas) {
        hideAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                wallCanvas.classList.add('hide-all');
                if (hideIconsCheckbox && hideIconsCheckbox.checked) {
                    hideIconsCheckbox.checked = false;
                    wallCanvas.classList.remove('hide-icons');
                }
            } else {
                wallCanvas.classList.remove('hide-all');
            }
        });
    }

    // Initialize collapsible sections
    document.querySelectorAll('.controls-section section h2').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('section');
            section.classList.toggle('collapsed');
        });
    });

    // Core elements required for WallArtPlanner to instantiate
    const corePlannerElements = [
        'wallCanvas', 'wallWidth', 'wallHeight', 
        'printWidth', 'printHeight', 'mattWidth', 'frameWidth', 'frameCount', 
        'addCollection', 'collectionsLegend'
        // Note: frameMaterialSelect is also used in WallArtPlanner constructor but might not be on all pages.
        // The constructor has checks for these elements.
    ];
    const missingCoreElements = corePlannerElements.filter(id => !document.getElementById(id));
    if (missingCoreElements.length > 0) {
        // If on a page that isn't the main planner (e.g., calculators, order form),
        // it's okay for some core planner elements to be missing.
        // We only want to fatal error if we are on index.html and core elements are missing.
        const isPlannerPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('boundary-test.html');
        if (isPlannerPage) {
            console.error('FATAL: Missing core WallArtPlanner elements on a planner page, cannot initialize:', missingCoreElements);
            return; // Stop initialization if core elements are missing on planner pages
        } else {
            console.warn('Non-planner page: Some core WallArtPlanner elements are missing, but this might be expected:', missingCoreElements);
            // Do not initialize planner-specific features if not on planner page
        }
    }


    // Initialize WallArtPlanner only if its essential DOM elements are present
    let isPlannerContext = false; // Renamed from isPlannerInitialized for clarity
    const wallCanvasForInit = document.getElementById('wallCanvas');
    const wallWidthForInit = document.getElementById('wallWidth');

    if (wallCanvasForInit && wallWidthForInit) {
        console.log('Essential WallArtPlanner DOM elements found. Initializing WallArtPlanner.');
        window.planner = new WallArtPlanner();
        isPlannerContext = true; // Set context true if planner is initialized
    } else {
        const onPlannerPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('boundary-test.html');
        if (onPlannerPage) {
            console.error("WallArtPlanner NOT initialized: Essential DOM elements (wallCanvas, wallWidth) are missing on a planner page.");
        } else {
            console.warn("WallArtPlanner not initialized: Essential DOM elements (wallCanvas, wallWidth) are missing. This might be expected on non-planner pages.");
        }
    }

    // Initialize SuggestionEngine if its essential DOM elements are present
    const getSuggestionButtonForInit = document.getElementById('getSuggestion');
    if (getSuggestionButtonForInit) {
        console.log("Essential SuggestionEngine DOM element ('getSuggestion' button) found. Initializing SuggestionEngine.");
        window.suggestionEngine = new SuggestionEngine();
    } else {
        // Don't log error if not on planner page, as it might be optional
        if (isPlannerContext) { // Only warn if we are in a planner context but button is missing
             console.warn("SuggestionEngine not initialized: 'getSuggestion' button is missing, though planner context is active.");
        }
    }

    // PriceCalculator can be initialized regardless, as it doesn't depend on DOM at construction.
    const priceCalculator = new PriceCalculator();

    // Add event listener for frame spacing changes - ONLY if planner is initialized AND element exists
    const frameSpacingSelect = document.getElementById('frameSpacing');
    if (frameSpacingSelect && window.planner) {
        frameSpacingSelect.addEventListener('change', (e) => {
            const newSpacing = Number(e.target.value);
            // console.log(`Frame spacing changed to: ${newSpacing}`);
            window.planner.updateFrameSpacing(newSpacing);
            window.planner.saveState(); // Ensure state is saved after spacing change
        });
        // Initialize with current value from the planner's state if available
        if (window.planner.frameSpacing !== undefined && String(window.planner.frameSpacing) !== frameSpacingSelect.value) {
            // console.log(`main.js: Initializing frame spacing from planner state: ${window.planner.frameSpacing}`);
            // frameSpacingSelect.value = String(window.planner.frameSpacing); // This is handled by WallArtPlanner's loadSavedState
            window.planner.updateFrameSpacing(window.planner.frameSpacing); // Ensure frames get updated
        } else if (window.planner.frameSpacing === undefined) {
            // console.log(`main.js: Initializing frame spacing from select default: ${frameSpacingSelect.value}`);
            window.planner.updateFrameSpacing(Number(frameSpacingSelect.value));
        }
    } else if (isPlannerContext && !frameSpacingSelect) { // Log if on planner page but element missing
        console.warn('Frame spacing select element (#frameSpacing) not found on a planner context page. Spacing control disabled.');
    }


    // Set up suggestion functionality - ONLY if suggestionEngine and planner are initialized
    const getSuggestionButton = document.getElementById('getSuggestion');
    const applySuggestionButton = document.getElementById('applySuggestion');

    if (getSuggestionButton && window.suggestionEngine && window.planner) {
        getSuggestionButton.addEventListener('click', () => {
            // console.log('Get Suggestion button clicked');
            try {
                // Get detailed frame data for suggestion engine
                const detailedFrames = [];
                if (window.planner && window.planner.collections) {
                    window.planner.collections.forEach(collection => {
                        if (collection.frames) {
                            collection.frames.forEach(frame => {
                                detailedFrames.push({
                                    x: frame.x, y: frame.y, 
                                    width: frame.width, height: frame.height, // Overall dimensions in inches
                                    printWidth: frame.printWidth, // Inches
                                    printHeight: frame.printHeight, // Inches
                                    mattWidth: frame.mattWidth, // Matt width in INCHES (Frame.js internal)
                                    frameWidth: frame.frameWidth // Frame width in INCHES (Frame.js internal)
                                });
                            });
                        }
                    });
                }

                if (detailedFrames.length === 0) {
                    alert("Please add some frames to the wall first to get a suggestion.");
                    return;
                }
                const suggestion = window.suggestionEngine.calculateSuggestion(detailedFrames);
                window.suggestionEngine.updateSuggestionUI(suggestion);
            } catch (error) {
                console.error('Error calculating suggestion:', error);
                alert('Error calculating suggestion: ' + error.message);
                if(window.suggestionEngine) window.suggestionEngine.hideSuggestionUI();
            }
        });
    }

    if (applySuggestionButton && window.suggestionEngine && window.planner) { // Added window.planner check
        applySuggestionButton.addEventListener('click', () => {
            // console.log('Apply Suggestion button clicked');
            try {
                const printWidthInput = document.getElementById('printWidth');
                const printHeightInput = document.getElementById('printHeight');
                const mattWidthInput = document.getElementById('mattWidth'); // Expects CM
                const frameWidthSelect = document.getElementById('frameWidth'); // Expects MM string value
                const frameCountInput = document.getElementById('frameCount');

                // Get values from suggestion UI
                const printSizeText = document.querySelector('.suggestion-result .print-size')?.textContent;
                const mattWidthText = document.querySelector('.suggestion-result .matt-width')?.textContent; // e.g., "5.0cm"
                const frameWidthText = document.querySelector('.suggestion-result .frame-width')?.textContent; // e.g., "20mm (0.79")"

                if (!printSizeText || !mattWidthText || !frameWidthText) {
                    alert("Could not read suggestion values from the UI.");
                    return;
                }

                const printDimensions = printSizeText.split('×').map(s => parseFloat(s.trim()));
                const mattWidthCm = parseFloat(mattWidthText); // Already in CM
                const frameWidthMmMatch = frameWidthText.match(/(\d+)mm/);
                const frameWidthMm = frameWidthMmMatch ? parseInt(frameWidthMmMatch[1]) : 20;

                if(printWidthInput) printWidthInput.value = printDimensions[0].toFixed(1);
                if(printHeightInput) printHeightInput.value = printDimensions[1].toFixed(1);
                if(mattWidthInput) mattWidthInput.value = mattWidthCm.toFixed(1); // Matt width is CM
                if(frameWidthSelect) frameWidthSelect.value = String(frameWidthMm); // Frame width is MM string
                if(frameCountInput) frameCountInput.value = "1"; // Default to 1 frame

                // Trigger input and change events for WallArtPlanner to pick up new values
                [printWidthInput, printHeightInput, mattWidthInput, frameWidthSelect, frameCountInput].forEach(input => {
                    if (input) {
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                
                // Update WallArtPlanner's newCollection object directly as well, as input listeners might not cover all cases
                if (window.planner) {
                    window.planner.newCollection.printWidth = printDimensions[0];
                    window.planner.newCollection.printHeight = printDimensions[1];
                    window.planner.newCollection.mattWidth = mattWidthCm; // Stored as CM in newCollection
                    window.planner.newCollection.frameWidth = parseFloat((frameWidthMm / 25.4).toFixed(3)); // Convert MM to Inches for newCollection
                    window.planner.newCollection.count = 1;
                }
                
                window.suggestionEngine.hideSuggestionUI();
            } catch (error) {
                console.error('Error applying suggestion:', error);
                alert('Error applying suggestion: ' + error.message);
            }
        });
    }

    // Set up price calculation functionality - ONLY if planner is initialized AND elements exist
    const calculatePriceButton = document.getElementById('calculatePrice');
    const priceSummaryModal = document.getElementById('priceSummaryModal');
    const priceSummaryContent = document.getElementById('priceSummaryContent');

    if (calculatePriceButton && priceSummaryModal && priceSummaryContent && window.planner) {
        calculatePriceButton.addEventListener('click', () => {
            // console.log('Calculate Price button clicked');
            try {
                if (!window.planner.collections || window.planner.collections.length === 0) {
                    alert('Please add some frames first to calculate prices.');
                    return;
                }
                const priceResults = priceCalculator.calculateCollectionPrices(window.planner.collections);
                const summaryHtml = priceCalculator.formatPriceResults(priceResults);
                priceSummaryContent.innerHTML = summaryHtml;
                priceSummaryModal.style.display = 'block';
            } catch (error) {
                console.error('Error calculating prices:', error);
                alert(error.message);
            }
        });
    }

    // Set up modal close functionality
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Function to expand Add New Collection section
    const expandAddNewCollection = () => {
        const addNewCollectionSection = Array.from(document.querySelectorAll('.controls-section section h2'))
                                        .find(h2 => h2.textContent.includes('Add New Collection'))
                                        ?.closest('section');
        if (addNewCollectionSection) {
            addNewCollectionSection.classList.remove('collapsed');
        }
    };

    // Check for stored frame data from calculators
    const newFrameDataString = localStorage.getItem('newFrameData');
    if (newFrameDataString) {
        try {
            const data = JSON.parse(newFrameDataString);
            console.log('Retrieved new frame data from calculator:', data);
            
            const printWidthInput = document.getElementById('printWidth');
            const printHeightInput = document.getElementById('printHeight');
            const mattWidthInput = document.getElementById('mattWidth'); // Expects CM
            const frameWidthSelect = document.getElementById('frameWidth'); // Expects MM
            const frameCountInput = document.getElementById('frameCount');
            
            if (printWidthInput && printHeightInput && mattWidthInput && frameWidthSelect && frameCountInput) {
                function setValueAndDispatch(element, value) {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }

                setValueAndDispatch(printWidthInput, data.printWidth.toFixed(1)); // printWidth from calc is in inches
                setValueAndDispatch(printHeightInput, data.printHeight.toFixed(1)); // printHeight from calc is in inches
                setValueAndDispatch(mattWidthInput, data.matWidth.toFixed(1)); // matWidth from calc is in CM
                
                // frameWidth from calculator is in INCHES. Convert to MM for the select dropdown.
                const frameWidthInches = Number(data.frameWidth);
                const frameWidthMM = Math.round(frameWidthInches * 25.4);
                
                let bestMatchValue = "20"; // Default if no options or match
                const options = Array.from(frameWidthSelect.options);
                if (options.length > 0) {
                    // Try exact match first
                    const exactMatchOption = options.find(opt => Number(opt.value) === frameWidthMM);
                    if (exactMatchOption) {
                        bestMatchValue = exactMatchOption.value;
                    } else {
                        // Find closest if no exact match
                        bestMatchValue = options.reduce((prev, curr) => 
                            Math.abs(Number(curr.value) - frameWidthMM) < Math.abs(Number(prev.value) - frameWidthMM) ? curr : prev
                        ).value;
                    }
                }
                setValueAndDispatch(frameWidthSelect, bestMatchValue);
                setValueAndDispatch(frameCountInput, String(data.count || 1));

                // Also update the planner's newCollection object to reflect these pre-filled values
                if (window.planner) {
                    window.planner.newCollection.printWidth = data.printWidth;
                    window.planner.newCollection.printHeight = data.printHeight;
                    window.planner.newCollection.mattWidth = data.matWidth; // CM
                    window.planner.newCollection.frameWidth = frameWidthInches; // Inches
                    window.planner.newCollection.count = data.count || 1;
                }

                expandAddNewCollection();
                localStorage.removeItem('newFrameData');
                // console.log('Successfully pre-filled form fields from calculator data.');
            } else {
                 console.warn("Could not pre-fill from calculator data: one or more form elements for 'Add New Collection' are missing.");
            }
        } catch (error) {
            console.error('Error parsing or applying new frame data from calculator:', error);
        }
    }
    // Note: The original 'else' block for 'wallArtPlannerData' was removed as 'wallArtPlannerState' is now the primary storage.
    // The main planner's loadSavedState handles restoring its own comprehensive state.

    // Add screenshot functionality
    const screenshotButton = document.getElementById('screenshotBtn');
    // wallCanvasElement is already defined as wallCanvasForInit if planner is initialized

    if (screenshotButton && wallCanvasForInit && typeof html2canvas === 'function') { 
        screenshotButton.addEventListener('click', () => {
            // console.log('Screenshot button clicked');
            const elementsToHideTemporarily = [];
            
            function hideElement(selector) {
                const el = document.querySelector(selector);
                if (el) {
                    elementsToHideTemporarily.push({ element: el, originalDisplay: el.style.display });
                    el.style.display = 'none';
                }
            }
            function hideElements(selector) {
                document.querySelectorAll(selector).forEach(el => {
                    elementsToHideTemporarily.push({ element: el, originalDisplay: el.style.display });
                    el.style.display = 'none';
                });
            }

            // Hide UI elements for a cleaner screenshot
            hideElements('.frame-controls');
            hideElements('.frame-dimensions');
            // hideElements('.distance-indicators'); // These might be desired in some screenshots
            // hideElements('.spacing-indicator');  // These might be desired
            hideElements('.boundary-marquee'); 
            hideElements('.test-frame-label'); 
            hideElements('.frame-boundary-indicator');
            hideElements('.component-indicators');
            
            hideElement('.wall-dimensions-display');
            // hideElement('.wall-controls'); // Keep wall controls like hide icons/all visible if user wants them
            hideElement('.debug-panel-container');

            // Add class to body for CSS-based hiding (e.g., pseudo-elements)
            // This is now primarily handled by onclone, but kept for robustness / other CSS rules.
            document.body.classList.add('screenshot-mode');

            html2canvas(wallCanvasForInit, { 
                logging: false, // Reduce console noise
                useCORS: true,
                scale: 2, 
                backgroundColor: getComputedStyle(wallCanvasForInit).backgroundColor || '#f5f5f5',
                onclone: (clonedDoc) => {
                    // Inject style to hide pseudo-elements like the frame move indicator in the cloned document
                    const style = clonedDoc.createElement('style');
                    // Ensure this rule is specific enough and uses !important
                    style.innerHTML = `
                        body.screenshot-mode .frame::before { display: none !important; }
                        .frame.frame-collision-blocked { outline: none !important; box-shadow: none !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                    
                    // If there are other elements within wallCanvasForInit that need specific styling for screenshot,
                    // they can be targeted here. For example, if hide-icons/hide-all was done by adding classes
                    // to frames themselves, those classes might need to be added in the clonedDoc.
                    // However, current implementation hides controls directly.
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'wall-layout.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error('Error generating screenshot:', err);
                alert('Could not generate screenshot. See console for details.');
            }).finally(() => {
                // Restore original display styles
                elementsToHideTemporarily.forEach(item => {
                    item.element.style.display = item.originalDisplay;
                });
                document.body.classList.remove('screenshot-mode');
                console.log('Screenshot mode finished.');
            });
        });
    } else if (isPlannerContext && (!screenshotButton || !wallCanvasElement)) {
        console.warn('Screenshot button or wall canvas not found. Screenshot functionality disabled.');
    } else if (isPlannerContext && typeof html2canvas !== 'function') {
        console.warn('html2canvas library not loaded. Screenshot functionality disabled.');
    }
});
