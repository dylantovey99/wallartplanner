/**
 * Application-wide constants
 * All magic numbers and configuration values
 */

// Display scaling
export const SCALE = 10; // Pixels per inch

// Pricing constants
export const PRICING = {
    MARKUP: 1.049,
    TAX_RATE: 1.06,
    ADDITIONAL_MARKUP: 1.09,
    FRAME_INCREMENT: 1.071,
    PRINT_MARKUP: 1.049,
    FRAME_20MM_MARKUP: 1.12,
    BASE_FEE: 0.60,
    ADDITIONAL_FEE: 0.20,

    // Frame cost calculation
    BASE_COST: 0.75,
    AREA_COEFFICIENT: 23.07,
    LINEAR_30MM: 2.92,
    LINEAR_OTHER: 3.57,
    MULTIPLIER: 1.5,
    BASE_ADDITION: 22,
    FRAME_MULTIPLIER: 2,

    // Print cost calculation
    PRINT_AREA_COEFFICIENT: 166.8759,
    PRINT_BASE: 0.174256
};

// Frame dimensions
export const FRAME_WIDTHS = {
    MM_20: 20,
    MM_30: 30,
    MM_40: 40
};

// Frame depth in centimeters
export const FRAME_DEPTHS = {
    20: 4, // 20mm frame = 4cm depth
    30: 3, // 30mm frame = 3cm depth
    40: 4  // 40mm frame = 4cm depth
};

// Frame materials
export const FRAME_MATERIALS = {
    BLACK: 'black',
    WHITE: 'white',
    OAK: 'oak',
    WALNUT: 'walnut'
};

// Frame material colors for rendering
export const FRAME_COLORS = {
    [FRAME_MATERIALS.BLACK]: '#111111',
    [FRAME_MATERIALS.WHITE]: '#FAFAFA',
    [FRAME_MATERIALS.OAK]: '#D2B48C',
    [FRAME_MATERIALS.WALNUT]: '#7B3F00'
};

// Default wall dimensions
export const DEFAULT_WALL = {
    width: 80,  // inches
    height: 80, // inches
    color: '#f0f0f0'
};

// Wall dimension limits
export const WALL_LIMITS = {
    MIN_WIDTH: 24,
    MAX_WIDTH: 600,
    MIN_HEIGHT: 24,
    MAX_HEIGHT: 600
};

// Frame dimension limits
export const FRAME_LIMITS = {
    MIN_PRINT_WIDTH: 0.1,
    MAX_PRINT_WIDTH: 200,
    MIN_PRINT_HEIGHT: 0.1,
    MAX_PRINT_HEIGHT: 200,
    MIN_MATT_WIDTH: 0,
    MAX_MATT_WIDTH: 50,
    MIN_COUNT: 1,
    MAX_COUNT: 100
};

// Grid settings
export const GRID_SIZES = [0.25, 0.5, 1, 2];
export const DEFAULT_GRID_SIZE = 0.5;

// Frame spacing settings
export const FRAME_SPACING_OPTIONS = [0.25, 1, 2, 3, 4, 6];
export const DEFAULT_FRAME_SPACING = 1;

// Background image settings
export const BACKGROUND_IMAGE_FIXED_HEIGHT_METERS = 2.4;
export const METERS_TO_INCHES = 39.3701;
export const BACKGROUND_IMAGE_FIXED_HEIGHT_INCHES =
    BACKGROUND_IMAGE_FIXED_HEIGHT_METERS * METERS_TO_INCHES;

// Collision detection
export const EPSILON = 0.001; // For floating point comparisons

// Event names
export const EVENTS = {
    FRAME_MOVE: 'frameMove',
    FRAME_DELETE: 'frameDelete',
    FRAME_UPDATE: 'frameUpdate',
    COLLECTION_EMPTY: 'collectionEmpty'
};

// Screenshot settings
export const SCREENSHOT = {
    SCALE: 2,
    FORMAT: 'image/png',
    QUALITY: 0.95,
    FILENAME: 'wall-layout.png'
};

// Local storage keys
export const STORAGE_KEYS = {
    PLANNER_STATE: 'wallArtPlannerState',
    NEW_FRAME_DATA: 'newFrameData',
    USER_PREFERENCES: 'wallArtPlannerPreferences'
};

// Modal settings
export const MODAL = {
    ANIMATION_DURATION: 300, // milliseconds
    AUTO_CLOSE_DELAY: 5000  // milliseconds for notifications
};

// Performance settings
export const PERFORMANCE = {
    DEBOUNCE_DELAY: 300,     // milliseconds
    THROTTLE_DELAY: 16,      // milliseconds (~60fps)
    DRAG_THROTTLE: 16,       // milliseconds for drag events
    SAVE_DEBOUNCE: 1000      // milliseconds for state saving
};

// Keyboard navigation
export const KEYBOARD = {
    MOVE_STEP: 1,           // inches to move per arrow key
    FINE_MOVE_STEP: 0.1     // inches for shift+arrow
};

// Conversion factors
export const CONVERSION = {
    CM_TO_INCHES: 1 / 2.54,
    MM_TO_INCHES: 1 / 25.4,
    INCHES_TO_CM: 2.54,
    INCHES_TO_MM: 25.4
};

// Image upload limits
export const IMAGE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024,      // 5MB
    MAX_DIMENSION: 10000,            // pixels
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    CROP_QUALITY: 0.85,
    THUMBNAIL_SIZE: 600              // pixels
};

// Aspect ratios for suggestions
export const ASPECT_RATIOS = {
    SQUARE: 1,
    STANDARD: 1.33,   // 4:3
    PHOTO: 1.5,       // 3:2
    WIDE: 1.77        // 16:9
};

// Z-index layers
export const Z_INDEX = {
    BACKGROUND: 0,
    FRAME: 1,
    FRAME_HOVER: 10,
    DRAGGING: 1000,
    COLLISION_HIGHLIGHT: 1001,
    MODAL: 10000
};
