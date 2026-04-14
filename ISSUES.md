# Frontend – Known Issues

Issues found in the Next.js app and API usage. Add new items below as numbered list entries.

---

## Critical

1. **Send success dialog shows empty amount** – app/(app)/send/page.tsx: `setAmount('')` runs before the success dialog is shown, so the dialog displays "AFK " with no value. Keep amount in state until the dialog is closed.

## High – Security

2. **API key stored in sessionStorage** – contexts/auth-context.tsx: API key is stored in `sessionStorage`; persists across tabs and is vulnerable to XSS. Prefer `httpOnly` cookies or short-lived tokens.
3. **Challenge token in URL** – app/(public)/auth/2fa/page.tsx: `challenge_token` is passed as a URL query parameter. It can leak via Referer headers, browser history, and server logs.

## High – Non-functional Flows

4. **Savings deposit only logs to console** – app/(app)/savings/page.tsx: `handleConfirmDeposit` only `console.log`s; no API call is made.
5. **Savings "New Goal" button does nothing** – app/(app)/savings/page.tsx: The button has no handler.
6. **SME "Get Started" and "Apply Now" have no handlers** – app/(app)/sme/page.tsx: Buttons are non-functional.
7. **Lending application only logs to console** – app/(app)/lending/page.tsx: `handleSubmitApplication` only `console.log`s; no API call.
8. **Currency operations simulate with setTimeout** – app/(app)/currency/page.tsx: Mint/Burn/International operations only simulate with `setTimeout`; no real API calls.
9. **Bill payment only logs to console** – app/(app)/bills/page.tsx: Payment handler only `console.log`s; no API call.
10. **Wallet confirm button disabled forever** – app/(app)/me/settings/wallet/page.tsx: "Confirm wallet" button is disabled with no implementation path.
11. **Security settings is a placeholder** – app/(app)/me/settings/security/page.tsx: Shows placeholder text "2FA and delete account options. Will wire to API."
12. **Mint page Burn tab non-functional** – app/(app)/mint/page.tsx: The Burn tab does not call the burn API; confirm step only sets success after a timeout.

## Medium – UX/Design

13. **AFK vs ACBU naming inconsistency** – Mint page and home use "AFK"; burn and other copy use "ACBU". Standardise product name across all labels, headers, and empty states.
14. **Balance always placeholder** – Balance is shown as "—" or "AFK —" on mint, send, home, and savings; no real balance API is wired.
15. **Savings: mock data mixed with API** – Savings page mixes API data (positions balance) with hardcoded cards (savingsAccounts, mockGoals with fixed dates). "Total Savings" and interest are static.
16. **Savings withdraw: user field confusing** – Withdraw page pre-fills "User (Stellar address or ID)" from getReceive but leaves it editable; users could change it and withdraw to the wrong account.
17. **Hardcoded fees and placeholder copy** – Mint burn card shows "Processing Fee: AFK 1.00"; network fee shows "See quote". Either compute from API or mark as estimate.
18. **Me page KYC badge always "Pending"** – app/(app)/me/page.tsx: KYC badge always shows "Pending" regardless of real status.
19. **Me page balance and stats hardcoded** – app/(app)/me/page.tsx: "AFK 12,450" and "This Month +AFK 2,340" are hardcoded, not from API.
20. **Business page stats hardcoded** – app/(app)/business/page.tsx: "Monthly Volume AFK 145,320" and "Employees 24" are hardcoded mock data.
21. **Burn tab shows unhelpful text** – app/(app)/mint/page.tsx: Burn tab shows "Local currency (see /burn for details)" — unclear UX that sends users elsewhere.
22. **International and gateway pages are stubs** – app/(app)/international/page.tsx and app/(app)/gateway/page.tsx: Show "Coming soon" with no CTA or timeline.
23. **Help page minimal** – app/(app)/me/help/page.tsx: Only shows "support@acbu.io" with no FAQs or support flow.
24. **Sign-in identifier label misleading** – Label says "Username" but backend accepts username, email, or E.164 phone. Use "Username, email, or phone".
25. **`?created=1` from signup ignored** – app/(public)/auth/signin/page.tsx: Query param from signup is never shown as a success message.
26. **Confirm dialog does not show note** – app/(app)/send/page.tsx: Note is collected but not shown in the confirm dialog.
27. **Send note never sent to API** – app/(app)/send/page.tsx: `note` is collected but never passed to `createTransfer` API.

## Medium – Error Handling

28. **Consistent API error handling missing** – burn/page.tsx handles ApiError with status-specific messages; ensure all other API-calling pages use the same pattern.
29. **loadTransfers and loadContacts swallow errors** – app/(app)/send/page.tsx: `.catch(() => {})` silently ignores failures.
30. **getReceive errors ignored** – app/(app)/savings/page.tsx: userApi.getReceive errors are swallowed.
31. **No error boundary** – app/layout.tsx: No React error boundary; uncaught errors can crash the entire app.
32. **No CSRF protection** – lib/api/client.ts: No CSRF token for state-changing requests.

## Medium – State Management

33. **useEffect missing opts in dependency array** – app/(app)/send/page.tsx: `useEffect` depends on `opts.token` but calls `loadTransfers`/`loadContacts` that use full `opts` object; `opts` is not in deps.
34. **Infinite loop risk in contacts page** – app/(app)/me/settings/contacts/page.tsx: `load` used in `useEffect` but not in deps; if added, would cause infinite loop. Use `useCallback`.
35. **Infinite loop risk in guardians page** – app/(app)/me/settings/guardians/page.tsx: Same pattern.
36. **useEffect missing opts in KYC page** – app/(app)/me/kyc/page.tsx: `opts` missing from dependency array.
37. **Savings deposit user filter too strict** – app/(app)/savings/deposit/page.tsx: `uri.length >= 56` filters out non-Stellar addresses; may block valid user IDs.

## Medium – Code Quality

38. **`as any` usage in currency page** – app/(app)/currency/page.tsx: `as any` used for tab value.
39. **`as any` usage in bills page** – app/(app)/bills/page.tsx: `as any` used for tab value.
40. **console.log left in production code** – app/(app)/savings/page.tsx, bills/page.tsx, lending/page.tsx, currency/page.tsx: `console.log` calls left in handlers.
41. **Index used as key in lists** – app/(app)/mint/page.tsx and app/(app)/rates/page.tsx: Rates lists use array index as `key` prop instead of a stable identifier.
42. **All user-facing strings hardcoded** – Entire codebase: No i18n support; all text is in English with no extraction or translation framework.

## Low – Accessibility

43. **Form labels and accessibility** – Many forms use `<label>` without `htmlFor` and no matching `id` on inputs (mint, send, burn, withdraw).
44. **Nav links lack aria-labels** – components/mobile-nav.tsx: Icon-only navigation links have no `aria-label` for screen readers.
45. **Password toggle has no aria-label** – app/(public)/auth/signin/page.tsx: Show/hide password button has no `aria-label`.
46. **Burn back link icon-only** – app/(app)/burn/page.tsx: Back link is icon-only with no `aria-label`.
47. **Send detail back link icon-only** – app/(app)/send/[id]/page.tsx: Back link is icon-only with no `aria-label`.
48. **Settings cards missing aria-label** – app/(app)/me/settings/page.tsx: Settings cards use `button` but no `aria-label` for screen readers.

## Low – Design Consistency

49. **Empty and loading states inconsistent** – Some pages use skeleton pulse, others plain text. Standardise empty states and loading skeletons across list views.
50. **Status badge colours in dark mode** – Send page uses fixed classes like `bg-green-100 text-green-700`; these look wrong in dark theme. Use semantic or theme-aware classes.
51. **Back button pattern inconsistent** – Some pages use `<button onClick={() => router.back()}>`, others use `<Link href="...">`. Prefer Link when the target is a known route.

## Low – Forms

52. **Burn form fields missing maxLength and validation** – app/(app)/burn/page.tsx: Account number, bank code, account name have no `maxLength`, format validation, or specific input types.
53. **Signup passcode minimum too weak** – app/(public)/auth/signup/page.tsx: Passcode minimum is 4 characters; weak for a financial app.
54. **Send amount allows negative via keyboard** – app/(app)/send/page.tsx: Amount input has no `min="0"` attribute.
55. **Contact inputs have no maxLength** – app/(app)/me/settings/contacts/page.tsx: Add contact inputs have no `maxLength`.
56. **Profile inputs have no maxLength or format validation** – app/(app)/me/profile/page.tsx: Username, email, phone have no `maxLength` or format validation.
57. **Recipient input has no maxLength** – app/(app)/send/page.tsx: Custom recipient input can overflow on small screens.

## Low – Navigation

58. **Activity links to /send/${id} instead of /transactions/${id}** – app/(app)/activity/page.tsx: Links to send detail instead of transaction detail; possible route duplication.
59. **"Two-Factor Auth" links to auth flow** – app/(app)/me/page.tsx: Links to `/auth/2fa` (auth flow) instead of a settings page.
60. **Nested interactive elements** – app/(app)/send/page.tsx: "Add Contact" uses `Link` inside `Button` (nested interactive elements), which is invalid HTML.

## Low – Data Display

61. **Transfer amounts not formatted** – app/(app)/page.tsx: Uses `t.amount_acbu ?? '—'` with no decimal formatting.
62. **Mock "Total Savings" mixed with API balance** – app/(app)/savings/page.tsx: Hardcoded "AFK 2,500.00" shown alongside real API balance.
63. **Currency balance misleading** – app/(app)/currency/page.tsx: Shows `(mockBalance * mockRate).toLocaleString()` as "≈ AFK" — misleading.
64. **Reserve data lacks context** – app/(app)/reserves/page.tsx: `reserve_ratio` and `health` shown without units or explanation.
65. **Rate displayed without formatting** – app/(app)/rates/page.tsx: Rate shown as `String(r.rate)` with no number formatting.
66. **Currency shown without locale** – app/(app)/burn/page.tsx: Currency shown as "NGN" with no locale-aware formatting.

## Low – Performance

67. **loadTransfers and loadContacts not memoized** – app/(app)/send/page.tsx: Functions recreated each render.
68. **Icons recreated each render** – app/(app)/savings/page.tsx: `savingsAccounts` array with JSX icon elements is defined outside component but icons are React elements.
69. **Menu items use router.push instead of Link** – app/(app)/me/page.tsx: Could use `Link` for prefetching.

## Trivial

70. **Clipboard API may fail on HTTP** – app/(app)/me/settings/receive/page.tsx: `navigator.clipboard.writeText` can fail in non-HTTPS; error handling is minimal.
