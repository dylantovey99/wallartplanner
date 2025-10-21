# Deployment Checklist

Use this checklist when deploying the Wall Art Planner to production.

## Pre-Deployment

### 1. Environment Setup
- [ ] Server has PHP 7.4 or higher
- [ ] OpenSSL PHP extension is installed
- [ ] HTTPS is configured and enabled
- [ ] Node.js 18+ is installed (for build)
- [ ] WordPress 5.0+ is installed (if applicable)

### 2. Security Configuration
- [ ] Generate encryption key: `php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"`
- [ ] Add encryption key to wp-config.php:
  ```php
  define('WALL_ART_ENCRYPTION_KEY', 'your-64-char-hex-key');
  ```
- [ ] Verify HTTPS is enforced (no HTTP access)
- [ ] Check that session cookies are secure (browser dev tools → Application → Cookies)

### 3. Build Process
- [ ] Clone repository: `git clone [repository-url]`
- [ ] Install dependencies: `npm install`
- [ ] Run linting: `npm run lint` (fix any errors)
- [ ] Run tests: `npm test` (all passing)
- [ ] Run E2E tests: `npm run test:e2e` (optional but recommended)
- [ ] Build for production: `npm run build`
- [ ] Verify dist/ folder contains built files

## Deployment

### 4. File Upload
- [ ] Backup existing installation
- [ ] Upload built files from `dist/` to server (recommended)
  - OR upload source files if using unminified version
- [ ] Upload `functions.php` to WordPress theme directory
- [ ] Verify file permissions (644 for files, 755 for directories)

### 5. Configuration Verification
- [ ] Check wp-config.php has `WALL_ART_ENCRYPTION_KEY` defined
- [ ] Verify .htaccess forces HTTPS (if using Apache)
- [ ] Check that debug mode is OFF in production
- [ ] Verify error reporting is appropriate for production

## Post-Deployment Testing

### 6. Functionality Tests
- [ ] Load main page (index.html)
- [ ] Add a frame collection
- [ ] Drag frame to new position
- [ ] Delete a frame
- [ ] Refresh page - verify state persists
- [ ] Calculate price for collection
- [ ] Take screenshot of layout
- [ ] Test frame suggestions
- [ ] Upload background image

### 7. Security Tests
- [ ] Check HTTPS in browser address bar (padlock icon)
- [ ] Open browser console - no errors shown
- [ ] Verify no console.log output (production build)
- [ ] Check cookies in dev tools:
  - [ ] Secure flag is SET
  - [ ] HttpOnly flag is SET
  - [ ] SameSite is Strict
- [ ] Test file upload:
  - [ ] Try uploading .php file (should be rejected)
  - [ ] Try uploading huge file (should be rejected)
  - [ ] Upload valid image (should work)

### 8. Browser Compatibility Tests
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Test on mobile (iOS Safari)
- [ ] Test on mobile (Android Chrome)

### 9. Accessibility Tests
- [ ] Tab through interface (keyboard navigation works)
- [ ] Test with screen reader (optional but recommended)
- [ ] Verify focus indicators are visible
- [ ] Check color contrast (use browser extension)
- [ ] Test with high contrast mode enabled
- [ ] Test with reduced motion preference

### 10. Performance Tests
- [ ] Run Lighthouse audit (score > 90 recommended)
- [ ] Check page load time (< 3 seconds recommended)
- [ ] Verify images load correctly
- [ ] Test with slow 3G connection
- [ ] Check memory usage (browser task manager)

## Monitoring Setup (Optional)

### 11. Error Tracking
- [ ] Sign up for error tracking service (Sentry/LogRocket)
- [ ] Get API key/DSN
- [ ] Update js/errorHandler.js with integration code
- [ ] Update js/logger.js with integration code
- [ ] Test error reporting (trigger intentional error)
- [ ] Verify errors appear in dashboard

### 12. Analytics (Optional)
- [ ] Add Google Analytics or similar
- [ ] Set up conversion tracking
- [ ] Configure custom events for key actions
- [ ] Test analytics in production

## Go-Live

### 13. Final Checks
- [ ] Review all checklist items above
- [ ] Have rollback plan ready (backup files)
- [ ] Notify stakeholders of deployment
- [ ] Set calendar reminder for 24-hour check
- [ ] Document any issues encountered

### 14. Post-Launch Monitoring (First 24 Hours)
- [ ] Check error logs every 4 hours
- [ ] Monitor server resource usage
- [ ] Review error tracking dashboard
- [ ] Test key functionality hourly
- [ ] Monitor user feedback/support tickets

## Ongoing Maintenance

### Daily (First Week)
- [ ] Check error logs
- [ ] Review error tracking dashboard
- [ ] Monitor support tickets
- [ ] Check server resources

### Weekly
- [ ] Run `npm audit` for security updates
- [ ] Review test coverage reports
- [ ] Check browser console for warnings
- [ ] Backup database and files

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Run full test suite
- [ ] Review accessibility with WAVE or axe
- [ ] Performance audit with Lighthouse
- [ ] Security scan with online tools

### Quarterly
- [ ] Full security audit review
- [ ] Code quality review
- [ ] Update documentation
- [ ] Review and prioritize feature requests

## Rollback Procedure

If something goes wrong:

1. **Immediate Actions**
   - [ ] Restore backed-up files
   - [ ] Restore database (if changed)
   - [ ] Clear cache
   - [ ] Verify old version works

2. **Investigation**
   - [ ] Check error logs
   - [ ] Review what changed
   - [ ] Identify root cause
   - [ ] Document issue

3. **Fix and Redeploy**
   - [ ] Fix issue in development
   - [ ] Test fix thoroughly
   - [ ] Follow deployment checklist again
   - [ ] Document lessons learned

## Emergency Contacts

**Technical Issues:**
- Server Admin: [Add contact]
- Developer: [Add contact]
- WordPress Support: [Add contact]

**Security Issues:**
- Security Team: [Add contact]
- Hosting Provider: [Add contact]
- Emergency Hotline: [Add number]

## Success Metrics

Track these metrics to measure success:

- [ ] Zero critical errors in first 24 hours
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Zero security incidents
- [ ] User satisfaction > 90%
- [ ] All features working as expected

---

## Deployment Status

**Date**: _______________
**Deployed By**: _______________
**Version**: 1.1.0
**Environment**: Production
**Status**: [ ] Successful  [ ] Issues Found

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

**Sign-off**: _______________  Date: _______________
