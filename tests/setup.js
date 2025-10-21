/**
 * Test setup file for Vitest
 * Runs before all tests
 */

// Mock localStorage
const localStorageMock = (() => {
    let store = {};

    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

global.localStorage = localStorageMock;

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
    global.performance = {
        now: () => Date.now(),
    };
}

// Mock window.matchMedia
global.matchMedia = global.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

// Reset mocks before each test
beforeEach(() => {
    localStorage.clear();
});
