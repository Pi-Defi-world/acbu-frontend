## 🔒 Security Fix: Secure API Key Storage via HttpOnly Cookies

**Fixes:** #19

### Problem
API keys were being stored in `sessionStorage`, which:
- **Exposes keys to XSS attacks** — Any malicious script can read JavaScript-accessible storage
- **Persists across tabs** — Increases attack surface
- **Violates security best practices** — Sensitive tokens should never be in JS-accessible memory

### Solution
Implemented **httpOnly cookie-based authentication**:
- API key is now stored in an httpOnly cookie (set by backend on login)
- HttpOnly cookies **cannot be accessed by JavaScript**
- Browser **automatically includes** the cookie in all API requests
- Only `userId` (non-sensitive) remains in sessionStorage

### Changes
- **`lib/api/client.ts`** — Added `credentials: 'include'` to all fetch requests
- **`contexts/auth-context.tsx`** — Removed `apiKey` storage; simplified to `userId` only
- **`app/(public)/auth/signin/page.tsx`** — Updated to pass only `userId` to login
- **`app/(public)/auth/2fa/page.tsx`** — Updated to pass only `userId` to login
- **`hooks/use-api.ts`** — Simplified; maintains backward compatibility

### Security Improvements
✅ **Eliminates XSS attack surface** — API keys no longer in JS memory  
✅ **HttpOnly enforcement** — Browser prevents JavaScript access  
✅ **Automatic transmission** — No manual token passing needed  
✅ **Same-site protection** — Browser enforces cookie same-site rules  

### Breaking Changes
⚠️ **Backend Integration Required:**

The backend **must set an httpOnly authentication cookie** on the `/auth/signin` endpoint:

```
Set-Cookie: auth_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/
```

Backend changes needed:
1. Remove `api_key` from response body
2. Set httpOnly cookie instead
3. Validate cookie on all protected endpoints

### Backward Compatibility
All existing API calls continue to work without changes — the cookie is sent automatically by the browser.

### Testing Notes
- Test sign-in flow (redirects to dashboard)
- Test 2FA verification
- Test API requests work (network tab should show cookie)
- Verify sessionStorage only contains `user_id` (not `api_key`)
- Test logout clears session data

### Related Issues
- Closes #19

---

**Branch:** `feature/19-secure-api-key-storage`  
**Commit:** `7dbc97a`
