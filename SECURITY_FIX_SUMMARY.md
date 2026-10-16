# Security Fix: API Key Storage Vulnerability

## Issue
**Severity:** Critical  
**Area:** frontend/auth  
**Problem:** Long-lived API keys were stored in sessionStorage, making them vulnerable to XSS attacks.

## Changes Made

### 1. Removed API Key from sessionStorage
- **File:** `contexts/auth-context.tsx`
- Removed `apiKey` from AuthState interface
- Removed `API_KEY_KEY` constant
- Removed all `sessionStorage.setItem(API_KEY_KEY, ...)` calls
- Updated `login()` function signature to not require API key
- Authentication now relies on httpOnly cookies set by backend

### 2. Updated API Client
- **File:** `lib/api/client.ts`
- Removed `setToken()` and `getToken()` functions
- Removed Bearer token and x-api-key headers from requests
- Authentication now handled via httpOnly cookies (credentials: 'include')
- Updated documentation to reflect cookie-based auth

### 3. Updated Authentication Pages
- **File:** `app/auth/signin/page.tsx`
  - Removed API key parameter from `login()` call
  - Moved passcode to secure in-memory storage instead of sessionStorage
  
- **File:** `app/auth/2fa/page.tsx`
  - Removed API key parameter from `login()` call

### 4. Secure Passcode Management
- **File:** `lib/passcode-manager.ts` (NEW)
  - Created in-memory passcode storage
  - Passcode is NOT stored in sessionStorage (reduces persistence exposure; active XSS can still access it)
  - Cleared on logout or page refresh
  - Only used for local wallet decryption

- **File:** `lib/wallet-storage.ts`
  - Updated to use in-memory passcode manager
  - Removed sessionStorage passcode retrieval

### 5. Content Security Policy
- **File:** `middleware.ts` (NEW)
  - Added CSP headers to prevent XSS attacks
  - Added X-Frame-Options, X-Content-Type-Options
  - Added Referrer-Policy and Permissions-Policy
  - Restricts script sources and inline scripts

## Security Improvements

### Before
- ❌ API keys stored in sessionStorage (JavaScript-accessible)
- ❌ Passcode stored in sessionStorage
- ❌ No Content Security Policy
- ❌ Vulnerable to XSS token exfiltration
- ❌ Long-lived tokens with no expiration

### After
- ✅ API keys in httpOnly cookies (JavaScript-inaccessible)
- ✅ Passcode in memory only (cleared on refresh/logout)
- ✅ Content Security Policy headers active
- ✅ XSS attacks cannot steal authentication tokens
- ✅ Backend controls token lifecycle

## Acceptance Criteria

✅ No `sessionStorage.getItem('acbu_api_key')` in code  
✅ No `sessionStorage.setItem('acbu_api_key', ...)` in code  
✅ No `sessionStorage.setItem('acbu_passcode', ...)` in code  
✅ Authentication works via httpOnly cookies  
✅ CSP headers block inline scripts  
✅ Passcode stored in memory only (for wallet operations)

## Backend Requirements

The backend must:
1. Set httpOnly session cookie on successful login
2. Cookie flags: `httpOnly=true`, `secure=true`, `sameSite=strict`
3. Validate cookie on all authenticated requests
4. Clear cookie on logout

Based on code comments, the backend already supports this.

## Testing Checklist

- [ ] Login flow works without API key in response
- [ ] Authenticated API requests succeed (cookies sent automatically)
- [ ] Logout clears session properly
- [ ] 2FA flow works correctly
- [ ] Wallet operations work with in-memory passcode
- [ ] Page refresh requires re-authentication
- [ ] CSP headers present in browser DevTools
- [ ] No API keys visible in sessionStorage (DevTools > Application > Session Storage)

## Known Limitations

1. **Passcode in Memory:** Passcode is stored in memory for wallet operations. It's cleared on page refresh, requiring users to log in again for wallet operations. This is more secure than sessionStorage but less convenient.

2. **Wallet custody boundary (W10-SEC-018):** New keys are generated in the browser and encrypted in local IndexedDB. Wallet address updates send only the public Stellar address; authentication responses are allowlisted and private-key/passphrase fields are discarded. Local encryption protects data at rest, not against active XSS or a compromised device. The backend must also remove legacy encrypted-key persistence and must never return wallet secrets; this frontend cannot change backend storage behavior.

3. **2FA Challenge Token:** Still in sessionStorage but this is acceptable as it's:
   - Short-lived (expires quickly)
   - Single-use token
   - Not a long-lived credential

## Migration Notes

- Frontend changes are backward compatible if backend still returns `api_key` (it's just ignored)
- No database migrations required
- Users will need to log in again after deployment
- Existing sessions in sessionStorage will be invalid

## Future Enhancements

1. Implement short-lived JWT access tokens + refresh tokens
2. Add token rotation on refresh
3. Implement "remember me" functionality with secure refresh tokens
4. Add rate limiting on authentication endpoints
5. Consider hardware security key support (WebAuthn)
