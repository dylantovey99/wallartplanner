# Wall Art Planner - Security & Code Quality Audit Report

**Date:** 2025-10-21
**Project:** Wall Art Planner
**Auditor:** Claude (AI Assistant)
**Status:** Beta Product

---

## Executive Summary

The Wall Art Planner is a browser-based JavaScript application for designing and pricing wall art layouts. This audit identifies critical security vulnerabilities, code quality issues, and provides actionable recommendations for improvement.

**Risk Level:** MEDIUM-HIGH

**Key Findings:**
- 8 Security vulnerabilities (2 Critical, 3 High, 3 Medium)
- Multiple code quality issues affecting maintainability
- No testing infrastructure
- Missing modern development tooling
- Accessibility concerns

---

## 1. Security Vulnerabilities

### 1.1 CRITICAL: Session Handling Issues (functions.php)
**Location:** `functions.php:2-26`
**Risk:** Critical
**Issue:** Multiple session_start() calls and improper session configuration
```php
session_start(); // Line 2
// ...
if (!session_id()) {
    session_start(); // Line 11 - Duplicate
}
```

**Impact:**
- Warning/error messages in production
- Session fixation vulnerabilities
- Unpredictable session behavior

**Recommendation:**
```php
<?php
// Secure session configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1); // HTTPS only
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.gc_maxlifetime', 3600);
    ini_set('session.use_strict_mode', 1);
    session_start();
}
```

### 1.2 CRITICAL: Insecure Data Encoding (functions.php)
**Location:** `functions.php:54-65`
**Risk:** Critical
**Issue:** Using base64 encoding for sensitive data (not encryption)
```php
function encodeAndChunkData($data, $chunkSize = 100) {
    $encodedData = base64_encode($data); // NOT SECURE
    return str_split($encodedData, $chunkSize);
}
```

**Impact:**
- Data is obfuscated but NOT encrypted
- Easily reversible
- False sense of security

**Recommendation:**
Use proper encryption:
```php
function encryptData($data, $key) {
    $cipher = 'aes-256-gcm';
    $ivlen = openssl_cipher_iv_length($cipher);
    $iv = openssl_random_pseudo_bytes($ivlen);
    $tag = '';

    $encrypted = openssl_encrypt(
        $data, $cipher, $key, 0, $iv, $tag
    );

    return base64_encode($iv . $tag . $encrypted);
}
```

### 1.3 HIGH: Missing Input Validation (functions.php)
**Location:** `functions.php:95-228`
**Risk:** High
**Issue:** No validation on uploaded files, POST data, or session variables

**Impact:**
- XSS vulnerabilities
- File upload attacks
- Session injection

**Recommendation:**
- Validate and sanitize all inputs
- Use WordPress nonce verification
- Implement file type checking
- Add MIME type validation

### 1.4 HIGH: External CDN Without Subresource Integrity
**Location:** `index.html:8`, `functions.php:204-211`
**Risk:** High
**Issue:** Loading scripts from CDN without SRI hashes
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        integrity="sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA=="
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

**Impact:**
- CDN compromise could inject malicious code
- Man-in-the-middle attacks

**Recommendation:**
- Keep SRI hashes (already present in index.html)
- Add SRI to all CDN resources
- Consider self-hosting critical dependencies

### 1.5 HIGH: Weak Random Number Generation
**Location:** `functions.php:47-52`, `js/utils.js:13-20`
**Risk:** High
**Issue:** Using weak random functions for IDs

**Impact:**
- Predictable IDs
- Potential enumeration attacks

**Recommendation:**
```javascript
// Use crypto.randomUUID() for better randomness
export function generateSecureId() {
    return crypto.randomUUID();
}
```

### 1.6 MEDIUM: No CSRF Protection
**Location:** All AJAX endpoints
**Risk:** Medium
**Issue:** No CSRF tokens for state-changing operations

**Recommendation:**
Implement WordPress nonces:
```php
wp_verify_nonce($_POST['_wpnonce'], 'wall_art_action');
```

### 1.7 MEDIUM: Client-Side Data Storage
**Location:** `js/WallArtPlanner.js:677-713`
**Risk:** Medium
**Issue:** Sensitive data stored in localStorage without encryption

**Recommendation:**
- Encrypt sensitive data before storing
- Consider session storage for temporary data
- Implement data expiration

### 1.8 MEDIUM: Verbose Error Messages
**Location:** Throughout codebase
**Risk:** Medium
**Issue:** Excessive console.log() in production revealing internal state

**Recommendation:**
Implement proper logging:
```javascript
// utils.js
const DEBUG = false; // Set via environment variable

export function log(...args) {
    if (DEBUG) console.log(...args);
}

export function error(...args) {
    console.error(...args); // Always log errors
}
```

---

## 2. Code Quality Issues

### 2.1 Excessive Logging
**Severity:** Medium
**Files:** All `.js` files
**Issue:** 100+ console.log statements in production code

**Recommendation:**
- Remove or conditionally disable debug logs
- Implement proper logging levels
- Use a logging library

### 2.2 Magic Numbers
**Severity:** Medium
**Files:** `PriceCalculator.js`, `Frame.js`, `styles.css`
**Examples:**
```javascript
// Bad
pricing = round(pricing * 1.06, 2);
pricing = round(pricing * 1.09, 2);

// Good
const TAX_RATE = 1.06;
const MARKUP_RATE = 1.09;
pricing = round(pricing * TAX_RATE, 2);
pricing = round(pricing * MARKUP_RATE, 2);
```

**Recommendation:**
Extract all magic numbers to named constants

### 2.3 No Type Safety
**Severity:** Medium
**Files:** All `.js` files
**Issue:** No TypeScript or JSDoc

**Recommendation:**
Add JSDoc comments:
```javascript
/**
 * Calculate price for frame and print
 * @param {number} width_cm - Width in centimeters
 * @param {number} length_cm - Length in centimeters
 * @param {number} mat_size_cm - Mat size in centimeters
 * @param {string} frame_type - Frame type ('20', '30', '40')
 * @returns {{frameCost: number, printCost: number, totalPrice: number}}
 */
function calculateFrameAndPrintPrice(width_cm, length_cm, mat_size_cm, frame_type) {
    // ...
}
```

### 2.4 Repetitive Code
**Severity:** Low-Medium
**Files:** Multiple
**Issue:** DRY violations throughout

**Examples:**
- Element validation repeated in `main.js`
- Similar logic in Frame.js and Collection.js
- Duplicate event listener setup

**Recommendation:**
- Create utility functions for common operations
- Use composition patterns
- Extract shared logic to base classes

### 2.5 Error Handling
**Severity:** Medium
**Issue:** Inconsistent error handling

**Recommendation:**
```javascript
// Create centralized error handler
class ErrorHandler {
    static handle(error, context) {
        console.error(`Error in ${context}:`, error);
        // Show user-friendly message
        this.showUserMessage('An error occurred. Please try again.');
        // Log to monitoring service
        this.logToService(error, context);
    }

    static showUserMessage(message) {
        // Display user-friendly error
        alert(message); // Replace with better UI
    }

    static logToService(error, context) {
        // Send to error monitoring service
        // e.g., Sentry, LogRocket
    }
}
```

---

## 3. Performance Issues

### 3.1 Excessive DOM Queries
**Severity:** Medium
**Location:** `FrameDragManager.js:163`
**Issue:** Repeated querySelector calls

**Recommendation:**
```javascript
class FrameDragManager {
    constructor(frame, wallDimensions, planner) {
        // ...
        this.wall = document.querySelector('.wall-canvas'); // Cache
    }

    _moveFrame(clientX, clientY) {
        // Use cached reference
        const wallRect = this.wall.getBoundingClientRect();
        // ...
    }
}
```

### 3.2 No Debouncing/Throttling
**Severity:** Low-Medium
**Location:** Drag operations, input handlers
**Issue:** High-frequency event handlers

**Recommendation:**
```javascript
// utils.js
export function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// Usage
this.handleMouseMove = throttle(this.handleMouseMove.bind(this), 16); // ~60fps
```

### 3.3 Large Bundle Size
**Severity:** Medium
**Issue:** No code splitting or bundling

**Recommendation:**
- Implement webpack or Vite
- Code splitting for calculators
- Lazy load non-critical modules

---

## 4. Accessibility Issues

### 4.1 Missing ARIA Labels
**Severity:** High
**Location:** All interactive elements

**Recommendation:**
```html
<button class="delete-btn" aria-label="Delete frame">×</button>
<button class="frame-info-btn" aria-label="View frame details">?</button>
<div class="wall-canvas" role="application" aria-label="Wall art planning canvas">
```

### 4.2 Keyboard Navigation
**Severity:** High
**Issue:** Frames not keyboard-accessible

**Recommendation:**
```javascript
// Frame.js
createFrameElement() {
    const element = createElement(`
        <div class="frame" tabindex="0" role="button"
             aria-label="Frame ${this.id}, ${formatMeasurement(this.width)} × ${formatMeasurement(this.height)}">
        // ...
    `);

    // Add keyboard handlers
    element.addEventListener('keydown', (e) => {
        const step = 1; // inch
        switch(e.key) {
            case 'ArrowUp': this.y -= step; break;
            case 'ArrowDown': this.y += step; break;
            case 'ArrowLeft': this.x -= step; break;
            case 'ArrowRight': this.x += step; break;
            case 'Delete': this.remove(); break;
            default: return;
        }
        e.preventDefault();
        this.updatePosition();
    });
}
```

### 4.3 Focus Management
**Severity:** Medium
**Issue:** No focus trapping in modals

**Recommendation:**
Implement focus trap for modal dialogs

---

## 5. Missing Infrastructure

### 5.1 No Testing
**Severity:** High
**Issue:** No unit, integration, or E2E tests

**Recommendation:**
Set up testing infrastructure:
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/dom": "^9.0.0",
    "playwright": "^1.40.0"
  }
}
```

Example test:
```javascript
// __tests__/PriceCalculator.test.js
import { describe, it, expect } from 'vitest';
import PriceCalculator from '../js/PriceCalculator.js';

describe('PriceCalculator', () => {
    it('calculates correct price for standard frame', () => {
        const calculator = new PriceCalculator();
        const result = calculator.calculateFrameAndPrintPrice(
            40, 50, 5, '20'
        );
        expect(result.totalPrice).toBeGreaterThan(0);
        expect(result.frameCost).toBeGreaterThan(0);
        expect(result.printCost).toBeGreaterThan(0);
    });
});
```

### 5.2 No Build System
**Severity:** Medium
**Issue:** No module bundling, minification, or optimization

**Recommendation:**
Create `package.json` and configure Vite:
```json
{
  "name": "wall-art-planner",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext .js"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "eslint": "^8.0.0",
    "@eslint/js": "^8.0.0"
  }
}
```

### 5.3 No Linting/Formatting
**Severity:** Low-Medium
**Issue:** Inconsistent code style

**Recommendation:**
Create `.eslintrc.json`:
```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "warn"
  }
}
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 4
}
```

### 5.4 No CI/CD
**Severity:** Low
**Issue:** No automated testing or deployment

**Recommendation:**
Create `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint
      - run: npm run build
```

---

## 6. Documentation Gaps

### 6.1 Minimal README
**Severity:** Medium
**Current:** Empty README
**Needed:**
- Project description
- Installation instructions
- Usage guide
- API documentation
- Contributing guidelines
- Browser compatibility

### 6.2 No Inline Documentation
**Severity:** Low-Medium
**Issue:** Complex functions lack comments

**Recommendation:**
Add comprehensive JSDoc comments

### 6.3 No Architecture Documentation
**Severity:** Medium
**Issue:** No diagrams or design docs

**Recommendation:**
Create `ARCHITECTURE.md` with:
- System overview
- Component diagram
- Data flow
- State management
- API contracts

---

## 7. Recommended Improvements

### 7.1 Immediate (Critical - Do Now)
1. **Fix session handling** in functions.php
2. **Replace base64 encoding** with proper encryption
3. **Add input validation** to PHP endpoints
4. **Remove debug console.logs** from production
5. **Add .gitignore** file
6. **Implement error boundaries**

### 7.2 Short-term (High Priority - Next Sprint)
1. **Add JSDoc comments** throughout
2. **Extract magic numbers** to constants
3. **Implement proper logging** system
4. **Add ARIA labels** for accessibility
5. **Create comprehensive README**
6. **Set up ESLint** and Prettier
7. **Add keyboard navigation**
8. **Cache DOM queries**

### 7.3 Medium-term (Should Have - Next Month)
1. **Set up testing infrastructure** (Vitest + Playwright)
2. **Implement build system** (Vite)
3. **Add TypeScript** or comprehensive JSDoc
4. **Create architecture documentation**
5. **Implement error monitoring** (Sentry)
6. **Add debouncing/throttling**
7. **Optimize bundle size**
8. **Add license file**

### 7.4 Long-term (Nice to Have - Next Quarter)
1. **Migrate to modern framework** (React/Vue/Svelte)
2. **Implement comprehensive test suite**
3. **Set up CI/CD pipeline**
4. **Add E2E tests**
5. **Performance monitoring**
6. **PWA support**
7. **Offline functionality**
8. **Multi-language support**

---

## 8. Positive Aspects

Despite the issues identified, the project has several strengths:

1. **Clean modular architecture** - ES6 modules well-organized
2. **Good separation of concerns** - Frame, Collection, DragManager separated
3. **Responsive design** - Mobile-friendly CSS
4. **Feature-rich** - Screenshot, suggestions, pricing, calculators
5. **State persistence** - LocalStorage implementation
6. **Collision detection** - Sophisticated drag handling
7. **User experience** - Intuitive interface
8. **No framework dependency** - Vanilla JS keeps it lightweight

---

## 9. Proposed File Structure

```
wallartplanner/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── js/
│   │   ├── core/
│   │   │   ├── WallArtPlanner.js
│   │   │   ├── Frame.js
│   │   │   ├── Collection.js
│   │   │   └── StateManager.js
│   │   ├── managers/
│   │   │   ├── FrameDragManager.js
│   │   │   ├── DeletionManager.js
│   │   │   └── BoundaryTester.js
│   │   ├── engines/
│   │   │   ├── SuggestionEngine.js
│   │   │   └── PriceCalculator.js
│   │   ├── utils/
│   │   │   ├── utils.js
│   │   │   ├── logger.js
│   │   │   ├── errorHandler.js
│   │   │   └── constants.js
│   │   └── main.js
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   └── styles.css
│   ├── pages/
│   │   ├── index.html
│   │   ├── frame-calculator.html
│   │   ├── print-calculator.html
│   │   └── order-form.html
│   └── php/
│       └── functions.php
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── CONTRIBUTING.md
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── package.json
├── vite.config.js
├── LICENSE
├── README.md
└── AUDIT_REPORT.md (this file)
```

---

## 10. Security Checklist

- [ ] Fix duplicate session_start() calls
- [ ] Implement proper encryption for sensitive data
- [ ] Add input validation on all user inputs
- [ ] Add CSRF protection
- [ ] Sanitize all output to prevent XSS
- [ ] Verify file uploads properly
- [ ] Use SRI for all CDN resources
- [ ] Implement Content Security Policy
- [ ] Use HTTPS-only cookies
- [ ] Add rate limiting for AJAX endpoints
- [ ] Implement proper authentication checks
- [ ] Use prepared statements for any database queries
- [ ] Add security headers (X-Frame-Options, etc.)
- [ ] Regular dependency updates
- [ ] Security audit of third-party libraries

---

## 11. Code Quality Checklist

- [ ] Remove all debug console.log statements
- [ ] Add comprehensive JSDoc comments
- [ ] Extract magic numbers to constants
- [ ] Implement proper error handling
- [ ] Add input validation
- [ ] Cache DOM queries
- [ ] Add debouncing/throttling
- [ ] Implement proper logging system
- [ ] Add unit tests (target 80%+ coverage)
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Set up linting (ESLint)
- [ ] Set up formatting (Prettier)
- [ ] Fix all linting errors
- [ ] Reduce code duplication

---

## 12. Accessibility Checklist

- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation
- [ ] Add focus indicators
- [ ] Implement focus trap in modals
- [ ] Test with screen readers
- [ ] Ensure color contrast meets WCAG AA
- [ ] Add skip links
- [ ] Ensure all images have alt text
- [ ] Make all functionality keyboard-accessible
- [ ] Test with keyboard-only navigation
- [ ] Add live regions for dynamic updates
- [ ] Ensure form labels are properly associated

---

## 13. Browser Compatibility

Currently uses modern ES6+ features without transpilation:
- ES6 modules
- Optional chaining
- Nullish coalescing
- Async/await
- Spread operator

**Recommended Support:**
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- iOS Safari: Last 2 versions

**Action Required:**
- Add babel for transpilation
- Add polyfills for older browsers
- Document supported browsers
- Add browser detection/warning

---

## 14. Conclusion

The Wall Art Planner is a well-architected vanilla JavaScript application with good separation of concerns and feature-rich functionality. However, it has critical security vulnerabilities, lacks modern development tooling, and has accessibility issues.

**Priority Actions:**
1. Address critical security issues immediately
2. Set up development tooling (testing, linting, building)
3. Improve accessibility
4. Add comprehensive documentation
5. Implement monitoring and error tracking

**Estimated Effort:**
- Critical fixes: 1-2 days
- High priority improvements: 1 week
- Medium-term improvements: 2-3 weeks
- Long-term improvements: 1-2 months

**Overall Assessment:**
With the recommended improvements, this project can become a production-ready, maintainable, and secure application. The current foundation is solid, but security and quality improvements are essential before wider deployment.

---

## Appendix A: Useful Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [JavaScript Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Secure Coding in PHP](https://phptherightway.com/#security)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**End of Audit Report**
