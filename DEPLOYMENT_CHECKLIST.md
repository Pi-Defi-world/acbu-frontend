# Deployment Checklist - Security Fix

## Pre-Deployment

- [ ] Review all changes in `SECURITY_FIX_SUMMARY.md`
- [ ] Verify backend is setting httpOnly cookies on login
- [ ] Test login flow in development environment
- [ ] Test 2FA flow in development environment
- [ ] Test wallet operations (mint, burn, send)
- [ ] Verify no API keys in sessionStorage (DevTools)
- [ ] Check CSP headers in browser DevTools Network tab

## Deployment Steps

1. [ ] Deploy backend changes first (if any cookie configuration needed)
2. [ ] Deploy frontend changes
3. [ ] Clear all user sessions (users will need to re-login)
4. [ ] Monitor error logs for authentication issues

## Post-Deployment Verification

- [ ] Login works correctly
- [ ] Logout clears session
- [ ] 2FA flow works
- [ ] Wallet operations work
- [ ] API requests succeed with cookies
- [ ] CSP headers are present
- [ ] No console errors related to auth
- [ ] Check sessionStorage in DevTools - should NOT contain:
  - `acbu_api_key`
  - `acbu_passcode`

## Rollback Plan

If issues occur:
1. Revert frontend deployment
2. Users may need to clear cookies and re-login
3. Check backend logs for cookie-related errors

## Security Verification

Run these checks in browser DevTools:

```javascript
// Should return null (no API key in sessionStorage)
sessionStorage.getItem('acbu_api_key')

// Should return null (no passcode in sessionStorage)
sessionStorage.getItem('acbu_passcode')

// Check cookies in DevTools:
// - Open DevTools > Application > Cookies
// - Or check Network tab > Headers > Set-Cookie
// - Look for httpOnly session cookie (cannot be read via document.cookie)
```

## Files Changed

- `contexts/auth-context.tsx` - Removed API key storage
- `lib/api/client.ts` - Removed Bearer token auth
- `app/auth/signin/page.tsx` - Updated login flow
- `app/auth/2fa/page.tsx` - Updated 2FA flow
- `lib/passcode-manager.ts` - NEW: In-memory passcode storage
- `lib/wallet-storage.ts` - Use in-memory passcode
- `middleware.ts` - NEW: CSP and security headers

## Support

If users report issues:
1. Ask them to clear cookies and sessionStorage
2. Ask them to log in again
3. Check if they can complete wallet operations
4. Verify CSP isn't blocking legitimate scripts
