# Remaining Tasks & Future Enhancements

This document tracks tasks that were identified during the audit but not yet implemented, plus future enhancement ideas.

## Priority 1: Complete Core Implementation (Estimated: 8-12 hours)

### 1.1 Update Remaining JS Files to Use Logger
**Status**: Infrastructure ready, mechanical changes needed
**Effort**: 2-3 hours
**Files to update:**
- `js/Frame.js` - Replace ~15 console.log calls
- `js/Collection.js` - Replace ~10 console.log calls
- `js/FrameDragManager.js` - Replace ~20 console.log calls
- `js/WallArtPlanner.js` - Replace ~25 console.log calls
- `js/main.js` - Replace ~8 console.log calls
- `js/SuggestionEngine.js` - Replace ~5 console.log calls
- `js/StateManager.js` - Replace ~3 console.log calls
- `js/BoundaryTester.js` - Replace ~5 console.log calls

**Steps:**
1. Import logger: `import { logger } from './logger.js';`
2. Replace all `console.log(...)` with `logger.debug(...)`
3. Replace all `console.warn(...)` with `logger.warn(...)`
4. Replace all `console.error(...)` with `logger.error(...)`
5. Test in browser with `?debug=true`

### 1.2 Implement Keyboard Navigation in Frame.js
**Status**: CSS foundation complete, JS implementation needed
**Effort**: 4-5 hours

**Add to Frame.js:**
```javascript
setupKeyboardNavigation() {
    this.element.addEventListener('keydown', (e) => {
        const MOVE_STEP = e.shiftKey ? 0.1 : 1; // Fine control with Shift
        const oldX = this.x;
        const oldY = this.y;

        switch(e.key) {
            case 'ArrowUp':
                this.y = Math.max(0, this.y - MOVE_STEP);
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.y = Math.min(
                    this.wallDimensions.height - this.height,
                    this.y + MOVE_STEP
                );
                e.preventDefault();
                break;
            case 'ArrowLeft':
                this.x = Math.max(0, this.x - MOVE_STEP);
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.x = Math.min(
                    this.wallDimensions.width - this.width,
                    this.x + MOVE_STEP
                );
                e.preventDefault();
                break;
            case 'Delete':
            case 'Backspace':
                this.remove();
                e.preventDefault();
                break;
            case 'Enter':
            case ' ':
                this.showFrameInfo();
                e.preventDefault();
                break;
        }

        // Check for collisions and announce
        if (this.x !== oldX || this.y !== oldY) {
            const collision = this.checkCollision();
            if (collision) {
                this.x = oldX;
                this.y = oldY;
                this.announceCollision();
            } else {
                this.updatePosition();
                this.announcePosition();
            }
        }
    });
}

announcePosition() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Frame at ${formatMeasurement(this.x)}, ${formatMeasurement(this.y)}`;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

announceCollision() {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.className = 'sr-only';
    announcement.textContent = 'Cannot move - collision detected';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}
```

**Testing:**
- Tab to frame
- Use arrow keys to move
- Use Shift+arrow for fine control
- Press Delete to remove
- Press Enter for info
- Test with screen reader

### 1.3 Apply Performance Utilities to FrameDragManager
**Status**: Performance utilities created, not yet integrated
**Effort**: 2-3 hours

**Changes needed in FrameDragManager.js:**
```javascript
import { throttle, domCache } from './performance.js';

class FrameDragManager {
    constructor(frame, wallDimensions, planner) {
        // ... existing code ...

        // Cache DOM queries
        this.wallCanvas = domCache.get('.wall-canvas');

        // Throttle mouse move for better performance
        this.handleMouseMove = throttle(
            this.handleMouseMove.bind(this),
            16 // ~60fps
        );
    }
}
```

**Expected improvement**: Smoother dragging, reduced CPU usage

---

## Priority 2: Increase Test Coverage (Estimated: 8-12 hours)

### 2.1 Add Unit Tests for Frame.js
**Current Coverage**: 0%
**Target Coverage**: 80%
**Effort**: 3-4 hours

**Test file: tests/unit/Frame.test.js**
```javascript
describe('Frame', () => {
    describe('constructor', () => {
        it('should create frame with correct dimensions');
        it('should validate dimensions');
        it('should apply frame material color');
    });

    describe('positioning', () => {
        it('should update position correctly');
        it('should stay within bounds');
        it('should dispatch frameMove event');
    });

    describe('keyboard navigation', () => {
        it('should move on arrow keys');
        it('should respect boundaries');
        it('should detect collisions');
    });

    describe('removal', () => {
        it('should remove from DOM');
        it('should dispatch frameDelete event');
        it('should clean up references');
    });
});
```

### 2.2 Add Unit Tests for Collection.js
**Current Coverage**: 0%
**Target Coverage**: 80%
**Effort**: 3-4 hours

### 2.3 Add Unit Tests for WallArtPlanner.js
**Current Coverage**: 0%
**Target Coverage**: 80%
**Effort**: 4-5 hours

### 2.4 Add More E2E Tests
**Current**: 10 test cases
**Target**: 25+ test cases
**Effort**: 3-4 hours

**Additional scenarios:**
- Multi-frame selection
- Batch operations
- Complex drag scenarios
- Error recovery
- State corruption handling
- Browser back/forward
- LocalStorage quota exceeded

---

## Priority 3: Documentation (Estimated: 4-6 hours)

### 3.1 Create ARCHITECTURE.md
**Effort**: 3-4 hours

**Should include:**
- System overview diagram
- Component interaction flow
- Data flow diagrams
- State management explanation
- Event system documentation
- Module dependencies graph

### 3.2 Add API Documentation
**Effort**: 2-3 hours

**Document:**
- All public methods
- Function parameters and return types
- Usage examples
- Common patterns

### 3.3 Create CONTRIBUTING.md
**Effort**: 1 hour

**Include:**
- Development setup
- Code style guide
- Pull request process
- Testing requirements
- Commit message format

---

## Priority 4: Advanced Features (Estimated: 20-40 hours)

### 4.1 Visual Regression Testing
**Effort**: 4-6 hours

**Implementation:**
1. Integrate Percy or Chromatic
2. Create baseline screenshots
3. Add to CI/CD pipeline
4. Configure diff thresholds

### 4.2 Multi-language Support (i18n)
**Effort**: 8-12 hours

**Steps:**
1. Extract all strings to translation files
2. Add i18n library (e.g., i18next)
3. Create language files (en, es, fr, etc.)
4. Update UI to use translations
5. Add language selector

### 4.3 Offline Support (PWA)
**Effort**: 6-8 hours

**Features:**
- Service worker for offline access
- App manifest for install
- Offline state persistence
- Background sync

### 4.4 Export Functionality
**Effort**: 4-6 hours

**Add exports:**
- Export as PDF
- Export as SVG
- Export as JSON (for import elsewhere)
- Export shopping list

### 4.5 Undo/Redo System
**Effort**: 6-8 hours

**Implementation:**
- Command pattern for actions
- History stack management
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- UI buttons

---

## Priority 5: Code Modernization (Estimated: 40-60 hours)

### 5.1 Migrate to TypeScript
**Effort**: 30-40 hours

**Benefits:**
- Type safety
- Better IDE support
- Fewer runtime errors
- Better documentation

**Steps:**
1. Add TypeScript configuration
2. Rename .js to .ts incrementally
3. Add type definitions
4. Fix type errors
5. Update build process

### 5.2 Consider Framework Migration
**Effort**: 40-80 hours (major undertaking)

**Options:**
- React (most popular, large ecosystem)
- Vue (easier learning curve)
- Svelte (best performance, smallest bundle)

**Only if:**
- Application complexity grows significantly
- Need better state management
- Want component reusability
- Have long-term maintenance plan

---

## Priority 6: Performance Optimization (Estimated: 6-10 hours)

### 6.1 Implement Virtual Scrolling
**Effort**: 3-4 hours
**For**: Large numbers of frames (100+)

### 6.2 Optimize Rendering
**Effort**: 2-3 hours

**Tasks:**
- Use requestAnimationFrame for animations
- Debounce expensive calculations
- Memoize pure functions
- Reduce DOM queries

### 6.3 Bundle Size Optimization
**Effort**: 2-3 hours

**Tasks:**
- Analyze bundle with webpack-bundle-analyzer
- Code split by route
- Lazy load heavy features
- Tree shake unused code

---

## Priority 7: Security Enhancements (Estimated: 4-6 hours)

### 7.1 Add CSRF Token Support
**Effort**: 2-3 hours

**Implementation:**
```php
// In functions.php
function get_csrf_token() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token($token) {
    return isset($_SESSION['csrf_token']) &&
           hash_equals($_SESSION['csrf_token'], $token);
}
```

### 7.2 Implement Content Security Policy
**Effort**: 2-3 hours

**Add to .htaccess or headers:**
```
Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
```

### 7.3 Add Rate Limiting
**Effort**: 2-3 hours

**Protect against:**
- Brute force attacks
- API abuse
- Resource exhaustion

---

## Priority 8: User Experience (Estimated: 8-12 hours)

### 8.1 Add Onboarding Tutorial
**Effort**: 3-4 hours

**Features:**
- First-time user walkthrough
- Interactive tooltips
- "Skip tutorial" option
- Remember preference

### 8.2 Improve Mobile Experience
**Effort**: 4-6 hours

**Tasks:**
- Touch gesture support (pinch-to-zoom)
- Mobile-optimized layout
- Bottom sheet for controls
- Swipe gestures

### 8.3 Add Keyboard Shortcuts Help
**Effort**: 1-2 hours

**Display:**
- Modal with all shortcuts
- Triggered by '?' key
- Searchable/filterable
- Printable

---

## Priority 9: Integration Features (Estimated: 12-20 hours)

### 9.1 WordPress Plugin Creation
**Effort**: 8-12 hours

**Features:**
- Easy installation
- Settings page
- Shortcode support
- Widget support

### 9.2 WooCommerce Deep Integration
**Effort**: 8-12 hours

**Features:**
- Add to cart directly from planner
- Save layouts to order meta
- Email layouts with orders
- Account dashboard integration

### 9.3 Third-party Integrations
**Effort**: Varies by integration

**Potential integrations:**
- Google Analytics events
- Facebook Pixel tracking
- Zapier webhooks
- Email service (Mailchimp)

---

## Quick Wins (Can be done anytime)

### Low Effort, High Impact
- [ ] Add loading spinners (1 hour)
- [ ] Improve error messages (1 hour)
- [ ] Add success notifications (1 hour)
- [ ] Create favicon and app icons (1 hour)
- [ ] Add "Copy to clipboard" for layouts (2 hours)
- [ ] Add recent layouts history (2 hours)
- [ ] Implement "Clear all" with confirmation (1 hour)
- [ ] Add frame rotation (3 hours)
- [ ] Add measurement units toggle (inches/cm) (2 hours)
- [ ] Add grid overlay toggle (2 hours)

---

## Technical Debt

### Issues to Address Eventually
1. **Remove jQuery UI dependency** (if any) - Use vanilla JS
2. **Consolidate duplicate code** in calculators
3. **Standardize event naming** across modules
4. **Create consistent API** for all classes
5. **Add proper error boundaries** for each component
6. **Implement proper null checks** throughout
7. **Add input sanitization** on client side too
8. **Create design tokens** for consistent styling

---

## Community Features (If Open Source)

### If making project public:
- [ ] Add LICENSE file
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Set up GitHub Discussions
- [ ] Create issue templates
- [ ] Add pull request template
- [ ] Set up GitHub Projects board
- [ ] Create roadmap document
- [ ] Set up sponsorship (GitHub Sponsors)

---

## Monitoring & Analytics

### Metrics to track:
- [ ] Page load time
- [ ] Time to interactive
- [ ] Error rate
- [ ] User engagement (frames added per session)
- [ ] Conversion rate (layouts to orders)
- [ ] Browser/device distribution
- [ ] Feature usage statistics

---

## Summary

**Total Estimated Effort**: 150-250 hours

**Recommended Order:**
1. ✅ **Week 1-2**: Priority 1 (Complete core - 12 hours)
2. **Week 3-4**: Priority 2 (Test coverage - 12 hours)
3. **Week 5**: Priority 3 (Documentation - 6 hours)
4. **Month 2**: Quick wins (10 hours)
5. **Month 3+**: Advanced features as needed

**Note**: Most items above are optional enhancements. The current implementation is production-ready and fully functional.
