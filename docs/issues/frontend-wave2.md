# Frontend - Wave 2 issues backlog (`acbu-frontend`)

Second-wave backlog for the Next.js 16 / React 19 frontend, produced after the 2026-06 merge. Verified locally on commit `2501926`:

- `pnpm run build` (next build) **fails** — prerender error on `/auth/oauth/callback`
- `pnpm run lint` — **58 errors / 3 warnings**
- `pnpm typecheck` — **passes only after deleting `.next`** (stale generated types otherwise break it)
- `.github/workflows/frontend-qa.yml` — **invalid YAML** (duplicated job, embedded JSON)

Evidence paths are relative to `acbu-frontend/`.

---

## A. CI / build

### W2-F-001 — `frontend-qa.yml` is invalid YAML (duplicated job + embedded JSON)
**Severity:** Critical | **Area:** frontend/ci | **Evidence:** `.github/workflows/frontend-qa.yml` — after `- name: Run component tests` (line 36) a second `steps:` block appears (lines 37-67), then raw JSON `"scripts": {...}` is pasted at lines 69-81
**Impact:** GitHub Actions cannot parse the file; the entire CI workflow never runs. No typecheck/lint/test gate exists. **Fix:** Rewrite the workflow as one clean job with unique steps. **Acceptance:** Workflow renders in the Actions UI and runs on push.

### W2-F-002 — Invalid action `actions/node-js@v4`
**Severity:** High | **Area:** frontend/ci | **Evidence:** `.github/workflows/frontend-qa.yml:22` uses `actions/node-js@v4` (correct name is `actions/setup-node@v4`)
**Impact:** Step fails at runtime even after the YAML is fixed. **Fix:** Use `actions/setup-node@v4`. **Acceptance:** CI setup-node step succeeds.

### W2-F-003 — CI has no `next build` step
**Severity:** High | **Area:** frontend/ci | **Evidence:** `frontend-qa.yml` runs install/typecheck/lint/test only — no build — so the prerender failure (W2-F-004) is never caught in CI
**Impact:** Production builds can be broken while CI is green. **Fix:** Add a build step. **Acceptance:** CI fails when `next build` fails.

### W2-F-004 — `next build` fails: `useSearchParams()` not wrapped in Suspense
**Severity:** Critical | **Area:** frontend/build | **Evidence:** `app/auth/oauth/callback/page.tsx:7` calls `useSearchParams()`; build output: `useSearchParams() should be wrapped in a suspense boundary` → prerender of `/auth/oauth/callback` fails, worker exits 1
**Impact:** Production build is impossible; the newly-shipped OAuth callback page blocks all deploys. **Fix:** Wrap the component in `<Suspense>` or read the code via `window.location.search` on the client only. **Acceptance:** `next build` completes.

### W2-F-005 — Fake test scripts (`test` / `test:e2e` just echo)
**Severity:** Medium | **Area:** frontend/tests | **Evidence:** `package.json:16-17` — `"test": "echo \"No tests\""`, `"test:e2e": "echo \"No e2e tests\""`; CI calls both
**Impact:** CI reports green while running zero tests. **Fix:** Wire real unit + e2e suites. **Acceptance:** CI executes actual tests.

### W2-F-006 — Playwright `testDir` excludes `e2e/` so smoke tests never run
**Severity:** Medium | **Area:** frontend/tests | **Evidence:** `playwright.config.ts` `testDir: './tests'` while the only smoke spec is `e2e/smoke.spec.ts` (and the a11y spec lives in `tests/`)
**Impact:** `playwright test` never executes smoke tests; silent gap. **Fix:** Add `e2e` to testDir or move the spec. **Acceptance:** Smoke tests execute in CI.

### W2-F-007 — Duplicate Stellar SDK versions
**Severity:** High | **Area:** frontend/deps | **Evidence:** `package.json` lists both `@stellar/stellar-sdk ^15.0.1` and `stellar-sdk ^13.3.0`
**Impact:** Two SDK copies with different APIs/behaviors; wallet/signing code may use the wrong one (bundle bloat + subtle incompatibilities). **Fix:** Keep one SDK version. **Acceptance:** `pnpm why stellar-sdk` shows one version.

### W2-F-008 — `tsconfig` includes `.next` generated types
**Severity:** Medium | **Area:** frontend/build | **Evidence:** `tsconfig.json` include list has `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`
**Impact:** Stale generated validators referencing removed pages break `tsc --noEmit` locally (reproduced); non-deterministic typechecks. **Fix:** Exclude `.next` from `tsc --noEmit` or delete the directory in the typecheck script. **Acceptance:** Typecheck is deterministic on a dirty tree.

### W2-F-009 — Frontend CI pins Node 20 while `engines`/Next 16 wants Node >= 20.9+ and local uses Node 24
**Severity:** Low | **Area:** frontend/ci | **Evidence:** `frontend-qa.yml` `node-version: 20`; local env runs Node 24.14
**Impact:** CI and dev environments can behave differently. **Fix:** Align on a single Node LTS. **Acceptance:** CI and local use the same major.

### W2-F-010 — No dependency audit in frontend CI
**Severity:** Medium | **Area:** frontend/ci | **Evidence:** workflow has no `pnpm audit` step
**Impact:** Vulnerable frontend deps ship silently. **Fix:** Add audit step. **Acceptance:** CI fails on critical frontend vulns.

---

## B. Routing / locale

### W2-F-011 — Two parallel route trees (top-level and `[locale]`) exist
**Severity:** High | **Area:** frontend/routing | **Evidence:** `app/burn`, `app/mint`, `app/send`, `app/savings` etc. exist at top level **and** a partial `app/[locale]/activity|auth/*` tree exists
**Impact:** Some pages are localized, most are not; inconsistent URLs, duplicated features, confusion about the source of truth. **Fix:** Consolidate on one tree (recommend full `[locale]`). **Acceptance:** Every route has exactly one source.

### W2-F-012 — Locale middleware does not cover top-level routes
**Severity:** Medium | **Area:** frontend/routing | **Evidence:** `middleware.ts` matcher `['/', '/(en|en-NG|en-KE)/:path*']` only; top-level `/mint`, `/burn` etc. bypass locale negotiation
**Impact:** Locale switching breaks on non-locale pages. **Fix:** Expand matcher / restructure routes. **Acceptance:** Locale cookie applies on all pages.

### W2-F-013 — OAuth callback path bypasses middleware
**Severity:** Medium | **Area:** frontend/auth | **Evidence:** `app/auth/oauth/callback` is a non-locale route not matched by `middleware.ts`
**Impact:** Callback page has no locale/header handling; inconsistent with app chrome. **Fix:** Move under `[locale]` or add matcher entry. **Acceptance:** Callback works with locale.

### W2-F-014 — `app/test-locale` leftover page shipped
**Severity:** Low | **Area:** frontend/hygiene | **Evidence:** `app/test-locale/` directory exists
**Impact:** Test page exposed in production route tree. **Fix:** Remove it. **Acceptance:** No test routes in prod build.

### W2-F-015 — `next.config` redirects bypass locales
**Severity:** Low | **Area:** frontend/routing | **Evidence:** `next.config.*` redirects `/account/*` → `/me/*` without locale prefix
**Impact:** Locale-aware users lose their locale on redirect. **Fix:** Redirect through the locale middleware. **Acceptance:** Redirect preserves locale.

### W2-F-016 — No 404 handler / not-found page for locale tree
**Severity:** Low | **Area:** frontend/ux | **Evidence:** no `app/[locale]/not-found.tsx` / `app/not-found.tsx` found
**Impact:** Default Next 404 page leaks framework branding. **Fix:** Add branded not-found pages. **Acceptance:** Unknown URLs render branded 404.

---

## C. Lint violations (eslint — one entry per file, `pnpm run lint`)

### W2-F-017 — Unused Dialog imports in wallet-setup page (dialog UI never rendered)
**Severity:** High | **Area:** frontend/auth | **Evidence:** `app/[locale]/auth/wallet-setup/page.tsx:5` — `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` all unused
**Impact:** The wallet-setup flow's dialog is dead; onboarding UX broken or placeholder. **Fix:** Render the dialog or remove the imports. **Acceptance:** Wallet-setup shows the intended UI.

### W2-F-018 — Unused `HandCoins` import in landing page
**Severity:** Low | **Area:** frontend/landing | **Evidence:** `app/[locale]/page.tsx:16` (TS6133)
**Impact:** Dead import. **Fix:** Remove it. **Acceptance:** Lint clean.

### W2-F-019 — `app/burn` page: 11 `any` types
**Severity:** Medium | **Area:** frontend/burn | **Evidence:** `app/burn/page.tsx:43,222,225,234,237,288,317,343,375,406` — `@typescript-eslint/no-explicit-any`
**Impact:** Untyped money/wallet data in a burn flow. **Fix:** Type the payloads (zod + TS interfaces). **Acceptance:** Lint clean; types enforced.

### W2-F-020 — Unused `ArrowRight` in SME page
**Severity:** Low | **Area:** frontend/business | **Evidence:** `app/business/sme/page.tsx:8`
**Impact:** Dead import. **Fix:** Remove it. **Acceptance:** Lint clean.

### W2-F-021 — Unused `index` in help page
**Severity:** Low | **Area:** frontend/help | **Evidence:** `app/help/page.tsx:142`
**Impact:** Dead variable. **Fix:** Remove it. **Acceptance:** Lint clean.

### W2-F-022 — Root layout imports guards but never uses them (guards disabled)
**Severity:** Critical | **Area:** frontend/auth | **Evidence:** `app/layout.tsx:3-11` — imports `headers`, `Analytics`, `ErrorBoundary`, `GlobalErrorHandler`, `AuthGuard`, `AppLayout`, `WalletSetupModal` — all unused
**Impact:** The global auth guard, error boundary, analytics, and layout wrapper are **not applied** to the app; users can access protected routes without auth and errors crash the whole page. **Fix:** Actually wrap children with these components. **Acceptance:** Protected route redirects to sign-in when unauthenticated.

### W2-F-023 — Unused `Badge`/`getKycBadgeConfig` in `/me`
**Severity:** Low | **Area:** frontend/me | **Evidence:** `app/me/page.tsx:6,33`
**Impact:** KYC badge UI not rendered. **Fix:** Use or remove. **Acceptance:** Lint clean.

### W2-F-024 — Savings page: 8 unused variables including deposit handlers
**Severity:** High | **Area:** frontend/savings | **Evidence:** `app/savings/page.tsx:33,100,101,137,142,147,152` — `savingsAccounts`, `handleSelectAccount`, `handleDeposit`, `handleConfirmDeposit`, `showDialog`, `showDepositDialog` all unused
**Impact:** The savings UI wires nothing — deposit/select handlers are never attached; the page is a static placeholder despite looking interactive. **Fix:** Wire the handlers to the dialog/forms or remove the dead code. **Acceptance:** Deposit button triggers the flow.

### W2-F-025 — `app/send/page.test.tsx` unused `React` import
**Severity:** Low | **Area:** frontend/tests | **Evidence:** `app/send/page.test.tsx:24`
**Impact:** Dead import. **Fix:** Remove it. **Acceptance:** Lint clean.

### W2-F-026 — Send page unused `loadingContacts` / `transfersList`
**Severity:** Medium | **Area:** frontend/send | **Evidence:** `app/send/page.tsx:108,273`
**Impact:** Contact loading state and transfer history list are never rendered; send flow partial. **Fix:** Wire them into the UI. **Acceptance:** Transfer history renders.

### W2-F-027 — `console.log` in global error handler
**Severity:** Low | **Area:** frontend/errors | **Evidence:** `components/global-error-handler.tsx:17` (no-console warning)
**Impact:** Info leak in browser console. **Fix:** Use a proper error-reporting call. **Acceptance:** Lint clean.

### W2-F-028 — focus-trap hook test: unused `vi` + 6 `any`
**Severity:** Medium | **Area:** frontend/a11y | **Evidence:** `hooks/__tests__/use-focus-trap.test.ts:1,28,52,77,96,115,159`
**Impact:** Test quality low; mocks untyped. **Fix:** Type and clean up. **Acceptance:** Lint clean.

### W2-F-029 — `use-focus-trap.ts` imports unused `useCallback`
**Severity:** Low | **Area:** frontend/a11y | **Evidence:** `hooks/use-focus-trap.ts:3`
**Impact:** Dead import. **Fix:** Remove it. **Acceptance:** Lint clean.

### W2-F-030 — `i18n/request.ts` uses `@ts-ignore` + `any`
**Severity:** Medium | **Area:** frontend/i18n | **Evidence:** `i18n/request.ts:8,11` — banned `@ts-ignore`, `any`
**Impact:** Suppressed type errors may hide real locale config mistakes. **Fix:** Use `@ts-expect-error` or fix the types. **Acceptance:** Lint clean.

### W2-F-031 — `lib/error-reporting.ts` `any` argument
**Severity:** Medium | **Area:** frontend/errors | **Evidence:** `lib/error-reporting.ts:13`
**Impact:** Untyped error payloads. **Fix:** Type with a discriminated union. **Acceptance:** Lint clean.

### W2-F-032 — `lib/logger.ts` untyped args + console statements
**Severity:** Medium | **Area:** frontend/logging | **Evidence:** `lib/logger.ts:5,20,22,27-30` — 6 `any` + 2 console warnings
**Impact:** Logger is essentially raw console; no levels/structure. **Fix:** Use a typed logger abstraction. **Acceptance:** Lint clean; logs structured.

### W2-F-033 — `lib/wallet-storage.ts` unused `getPasscode` + 3 `any`
**Severity:** High | **Area:** frontend/wallet | **Evidence:** `lib/wallet-storage.ts:2,61,108,110`
**Impact:** Dead function + untyped storage access in the wallet secret store (sensitive area). **Fix:** Type storage schema; remove dead exports. **Acceptance:** Lint clean; storage typed.

---

## D. Logic / correctness

### W2-F-034 — OAuth callback redirect target read from `sessionStorage` unvalidated
**Severity:** Medium | **Area:** frontend/auth | **Evidence:** `app/auth/oauth/callback/page.tsx:38-40` — `returnPath = sessionStorage.getItem('oauth_return_path') || '/'` then `router.replace(returnPath)`
**Impact:** Any code that can write sessionStorage controls post-login navigation (internal redirect abuse). **Fix:** Validate the path starts with `/` and is not `//`/protocol-relative. **Acceptance:** External/evil return paths are rejected.

### W2-F-035 — OAuth callback marks success without exchanging the code
**Severity:** High | **Area:** frontend/auth | **Evidence:** `app/auth/oauth/callback/page.tsx:36` — `setStatus('success')` immediately; no token exchange or session creation
**Impact:** The UI reports "Signed in successfully" while no session exists — false confirmation (matches prior F-014 class of issue in a new place). **Fix:** Exchange code for a session before showing success. **Acceptance:** Success only after session is created.

### W2-F-036 — No security headers / CSP in middleware
**Severity:** High | **Area:** frontend/security | **Evidence:** `middleware.ts` only does next-intl; no `X-Frame-Options`, `CSP`, `Referrer-Policy`, HSTS
**Impact:** Clickjacking/XSS-exfiltration risk on a fintech UI. **Fix:** Add security headers (ideally a strict CSP, since `app/api/csp-report` exists). **Acceptance:** Response headers include CSP; report endpoint receives violations.

### W2-F-037 — `app/api/csp-report` exists but no CSP is set
**Severity:** Medium | **Area:** frontend/security | **Evidence:** `app/api/csp-report/` route present; middleware sends no CSP header (W2-F-036)
**Impact:** Report-only endpoint collects nothing. **Fix:** Enable CSP with `report-uri` pointing at the route. **Acceptance:** CSP violations are logged.

### W2-F-038 — `use-rates` module-scope cache never invalidates on error
**Severity:** Low | **Area:** frontend/hooks | **Evidence:** `hooks/use-rates.ts:17-23` — `cachedRates`/`cachedAt` only updated on success; on repeated failure stale rates are served forever
**Impact:** Users can see long-stale FX rates after a rate source outage. **Fix:** Add an error TTL / forced expiry. **Acceptance:** Stale rates are flagged after outage threshold.

### W2-F-039 — `use-config` sets `cachedAt` even when the component was cancelled
**Severity:** Low | **Area:** frontend/hooks | **Evidence:** `hooks/use-config.ts:81` — `cachedAt = Date.now()` runs regardless of `cancelled`
**Impact:** Minor: a cancelled mount still marks the cache fresh; harmless but sloppy. **Fix:** Guard with `if (!cancelled)`. **Acceptance:** Code review clean.

### W2-F-040 — No fetch timeouts on rates/config hooks
**Severity:** Medium | **Area:** frontend/hooks | **Evidence:** `hooks/use-rates.ts`, `hooks/use-config.ts`, `lib/api/rates.ts` — no AbortController/timeout
**Impact:** A hung backend leaves the UI loading forever. **Fix:** Add timeout + abort on unmount. **Acceptance:** Loading state clears within timeout.

### W2-F-041 — Accessibility test disables `color-contrast` (WCAG AA) rule
**Severity:** Medium | **Area:** frontend/a11y | **Evidence:** `tests/accessibility.spec.ts:49,63,91,162,210` — `.disableRules(['color-contrast'])`
**Impact:** Core accessibility failures are masked; the suite gives false confidence. **Fix:** Re-enable the rule and fix contrast issues. **Acceptance:** Suite passes with contrast enabled.

### W2-F-042 — Accessibility tests exclude `.chakra-portal` (framework not used)
**Severity:** Low | **Area:** frontend/a11y | **Evidence:** `tests/accessibility.spec.ts:48` — excludes a Chakra selector in a shadcn/tailwind app
**Impact:** Leftover from a template; exclusion is meaningless. **Fix:** Remove the exclusion. **Acceptance:** Tests run without it.

### W2-F-043 — A11y test mock intercepts `/api/auth/**` but app auth is session-based
**Severity:** Low | **Area:** frontend/tests | **Evidence:** `tests/accessibility.spec.ts:29` — mocks an API the app may not use; no assertion that auth actually works
**Impact:** Tests may run against unauthenticated pages unknowingly. **Fix:** Align the mock with the real auth flow. **Acceptance:** Tests assert authenticated state.

### W2-F-044 — A11y tests don't assert on actual page errors (networkidle + timeouts only)
**Severity:** Medium | **Area:** frontend/tests | **Evidence:** `tests/accessibility.spec.ts:6-25` — waits for `networkidle`/timeouts but never checks for page error boundaries
**Impact:** A page that errors still "passes" a11y. **Fix:** Assert no error boundary is visible. **Acceptance:** Tests fail when a page throws.

### W2-F-045 — No accessibility coverage for money-critical flows (send amount validation)
**Severity:** Medium | **Area:** frontend/a11y | **Evidence:** a11y specs cover pages but not keyboard-only form validation flows
**Impact:** Screen-reader users can't complete money transfers reliably. **Fix:** Add keyboard-only and ARIA-focused assertions. **Acceptance:** Send/mint flows pass axe with keyboard navigation.

### W2-F-046 — `useSearchParams` missing Suspense (runtime error surface)
**Severity:** High | **Area:** frontend/build | **Evidence:** W2-F-004 — also causes a CSR bailout warning at runtime
**Impact:** On slow networks the page bails to client rendering unexpectedly. **Fix:** Wrap in Suspense with a fallback. **Acceptance:** No bailout warning in dev logs.

### W2-F-047 — `app/[locale]/auth/signup` passcode/2FA UX not connected to backend
**Severity:** High | **Area:** frontend/auth | **Evidence:** new `app/[locale]/auth/*` pages (2fa, signin, signup, wallet-setup) — no API calls found in the new files
**Impact:** The new auth pages are visual shells; no real sign-in/signup flow. **Fix:** Wire to the backend auth endpoints. **Acceptance:** Sign-up creates a session end-to-end.

### W2-F-048 — `components/page-transition.tsx` and `components/onboarding/media.tsx` unverified
**Severity:** Low | **Area:** frontend/components | **Evidence:** new files added in the merge; no tests; `page-transition` uses CSS transforms that can hurt a11y (prefers-reduced-motion not checked)
**Impact:** Motion-sensitive users may get disorienting transitions. **Fix:** Respect `prefers-reduced-motion`. **Acceptance:** Transitions disabled under reduced motion.

### W2-F-049 — `next.config` has no `experimental` / stale-time cache for static assets
**Severity:** Low | **Area:** frontend/perf | **Evidence:** `next.config.*` — `poweredByHeader:false` and `images.unoptimized` only
**Impact:** No asset caching tuning; images unoptimized (bandwidth cost). **Fix:** Configure image optimization/remote patterns deliberately. **Acceptance:** Image pipeline is intentional and documented.

### W2-F-050 — `app/[locale]/page.tsx` landing references features that may not exist
**Severity:** Medium | **Area:** frontend/landing | **Evidence:** landing page links/sections (currency, savings, lending, bills) vs routing tree — verify each CTA target exists
**Impact:** Broken CTAs degrade onboarding. **Fix:** Link-check all CTAs. **Acceptance:** Every landing CTA resolves.

---

## Summary

**Wave-2 frontend total: 50 issues (W2-F-001..W2-F-050)** — 3 Critical, 11 High, 19 Medium, 17 Low.

Top remediation order:
1. W2-F-001/002 (CI YAML) + W2-F-004 (build failure) — unblock CI.
2. W2-F-022 (root layout guards not applied) + W2-F-035 (false auth success).
3. W2-F-036/037 (security headers/CSP).
4. W2-F-017..033 (lint + dead UI wiring).
5. Routing consolidation (W2-F-011..015).