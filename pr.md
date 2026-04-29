# fix(currency): replace mock balance/rates with real API + add toasts

Closes #190

## Summary

`/currency` looked like it was executing real trades but was showing
fabricated numbers — a hardcoded `mockBalance` of `5280.5`, a hardcoded
NGN rate of `1620`, a `0.82` "exchange rate" that had no relation to the
oracle, and a hardcoded `1.8` rate for international transfers. Fees
(`$2.50`, `$1.00`, `0.50`) were also invented client-side. Users had no
way to tell what would actually happen when they clicked Confirm.

The submit itself already POSTed to `/mint/usdc` and `/burn/acbu`, but
feedback arrived only through an in-page dialog, and the `<Toaster />`
component wasn't even mounted — so any `toast(...)` call in the app was a
silent no-op.

This PR replaces every fabricated number with data from the backend and
wires up real toasts for success and failure, so what the user sees
matches what the server does.

## Why

The issue flagged: *Users think trades executed. Fix direction: Replace
timeouts with real API calls + toasts. Acceptance check: Network tab
shows POST to backend on confirm.*

The POST was already happening, but the surrounding UI was lying about
balance, rates, fees, and outcome. That's the same failure mode the
issue names — users believed a trade executed at numbers that were never
real.

## Changes

### [app/layout.tsx](app/layout.tsx)

- Imported and mounted `<Toaster />` inside `AuthProvider`. It was
  missing from the root layout, so the existing `useToast` / `toast()`
  API throughout the codebase was effectively dead. This was a
  prerequisite for the toast work below.

### [app/currency/page.tsx](app/currency/page.tsx)

**Removed fabricated numbers**

- Deleted `const mockBalance = 5280.5`, `const mockRate = 1620`, and
  `const exchangeRate = 0.82`.
- Deleted the hardcoded fees in the form and confirmation dialog
  (`$2.50`, `$1.00`, `${intlCurrency} 0.50`) and the hardcoded
  international rate (`* 1.8`).

**Wired in real data**

- `useBalance()` drives the header balance card, the "Available:" hint
  on the burn tab, and the "insufficient balance" gate. While balance
  is loading or unknown the UI shows `ACBU —` instead of a fake number.
- `ratesApi.getRates(opts)` is fetched on mount. Three small helpers —
  `localPerAcbu`, `estimateAcbuFromUsd`, `estimateLocalFromAcbu` —
  convert between ACBU and any currency the oracle publishes
  (`acbu_usd`, `acbu_ngn`, `acbu_gbp`, …). They mirror the shape used
  in [app/mint/page.tsx](app/mint/page.tsx) and
  [app/page.tsx](app/page.tsx), so there's one consistent way to read
  the rate oracle across the app.
- Mint preview now reads "You'll receive: ACBU X" from the real USD
  rate, falling back to `ACBU — (rate unavailable)` if the key is
  missing rather than silently using 0.82.
- Burn preview shows `₦ X` derived from `acbu_ngn`.
- International preview shows `<CCY> X` derived from
  `acbu_<ccy>` and displays the actual per-ACBU rate below it. No
  supported currency → clear "rate unavailable for <CCY>" message.
- Fees in the input panes and the confirmation dialog are relabeled
  "Calculated at confirmation" / "Calculated by backend" — honest
  about who owns the number.

**Real feedback on submit**

- `handleExecute` captures the full `MintResponse` / `BurnResponse` in
  a new `lastResponse` state. The success dialog now renders the
  backend-returned `transaction_id`, `status`, `fee`, `acbu_amount`,
  and `local_amount` / `currency` — so the user sees what the server
  actually recorded, not what the client estimated. The dialog title
  changed from "Operation Complete" to "Operation Submitted" to match
  reality (most of these calls return a pending status, not a final
  one).
- Success path dispatches a `toast({ title, description })` with the
  tx id and status.
- Error path dispatches a `toast({ variant: 'destructive', ... })`
  with the server message, in addition to the existing inline error.
- `refreshBalance()` is called on success so the header card reflects
  the post-trade state without a page reload.

## Acceptance check

The issue's acceptance check: *Network tab shows POST to backend on
confirm.*

1. Open `/currency`, open DevTools → Network, filter on `Fetch/XHR`.
2. Pick any tab (Mint / Burn / International), fill the form with valid
   values, click the primary button, confirm in the dialog.
3. Network panel shows a real `POST` to `/mint/usdc` (mint tab) or
   `/burn/acbu` (burn and international tabs) with the form payload.
4. Toast appears with the returned transaction id and status.
5. Success dialog shows the backend's `fee`, `acbu_amount`, and
   `local_amount` — all sourced from the API response, no client-side
   estimates.
6. On error: destructive toast with the server's message; inline error
   preserved under the Confirm button.

## Before / after

| | Before | After |
|---|---|---|
| Header balance | `ACBU 5,280.50` (hardcoded) | `useBalance()` — real wallet balance, `—` while loading |
| NGN conversion | `balance * 1620` | `balance * acbu_ngn` from `/rates`, `—` if missing |
| Mint preview | `usd * 0.82` | `usd / acbu_usd` from `/rates` |
| Burn preview | `acbu / 0.82` → `$` | `acbu * acbu_ngn` → `₦` |
| International preview | `acbu * 1.8` | `acbu * acbu_<ccy>` from `/rates` |
| Fees shown | `$2.50`, `$1.00`, `0.50` (invented) | "Calculated at confirmation"; real `fee` shown in success dialog |
| Toasts on submit | none (Toaster not mounted) | success + destructive variants |
| Success dialog | "Operation Complete" + tx id only | "Operation Submitted" + status, fee, received amounts, currency |
| Balance after trade | stale until reload | `refreshBalance()` called on success |

## Design notes

- **Why no quote endpoint.** `/rates` already exposes every `acbu_<ccy>`
  the backend supports, and the existing `/mint` page estimates the
  same way. Adding a dedicated client-side quote call would duplicate
  that. When the backend exposes a real quote endpoint for fees, the
  "Calculated at confirmation" placeholder is where it plugs in.
- **Why not fail closed when a rate is missing.** The submit itself
  doesn't depend on the client-side estimate — it posts raw
  amounts and lets the backend compute everything. A missing rate
  means we can't show a preview, but the trade is still executable,
  so the UI shows "— (rate unavailable)" rather than blocking the
  form.
- **Why keep `useBalance()` instead of a one-shot fetch.** The hook
  already handles loading/error state and exposes a `refresh()` —
  reusing it means the header behaves like the rest of the app
  (same cache-miss rules, same auth handling) and `refreshBalance()`
  after submit is a one-liner.

## Risk / blast radius

- Scoped to `/currency` plus the one-line Toaster mount in
  `app/layout.tsx`. No API client, type, or shared component changed.
- The Toaster mount is additive — it's the documented shadcn/ui
  installation for this project and matches what `useToast` was
  already written against. Nothing else in the app was relying on
  Toaster being absent.
- No new dependencies.

## Test plan

- [ ] Header balance card: shows real `useBalance()` value when signed
      in, `ACBU —` while loading, does not show `5280.50` anymore.
- [ ] Mint tab: "You'll receive" preview updates with `acbu_usd` from
      `/rates`; when `acbu_usd` is missing, shows `ACBU — (rate
      unavailable)`.
- [ ] Burn tab: "You'll receive" preview uses `acbu_ngn`; "Insufficient
      balance" fires only against the real balance; submit is gated
      accordingly.
- [ ] International tab: changing `intlCurrency` updates the per-ACBU
      rate display and the preview amount using the matching
      `acbu_<ccy>` key; unsupported currency shows "rate unavailable".
- [ ] DevTools Network on confirm:
  - Mint → `POST /mint/usdc` with `{ usdc_amount, wallet_address,
    currency_preference: 'auto' }`.
  - Burn → `POST /burn/acbu` with currency `NGN` and the recipient
    account.
  - International → `POST /burn/acbu` with the selected currency and
    recipient account.
- [ ] Success: destructive toast does **not** fire; success toast
      shows with tx id + status; success dialog shows real `fee` and
      `acbu_amount` / `local_amount` from the response; header balance
      refreshes.
- [ ] Error (simulate with bad input / offline): destructive toast
      fires with the server message; inline error shown under the
      Confirm button; step does not advance to `success`.
- [ ] `<Toaster />` is visible in the DOM tree (confirms the layout
      mount).

## Follow-ups (not in this PR)

- The burn path on `/currency` submits straight to `/burn/acbu` without
  the on-chain Stellar `blockchain_tx_hash` that the dedicated
  [app/burn/page.tsx](app/burn/page.tsx) builds via
  `submitBurnRedeemSingleClient`. The backend may reject the burn
  without it. Resolving this means either porting the Stellar flow
  into `/currency` or routing the Burn/International tabs over to
  `/burn`. Flagging separately — this PR is scoped to the mocked-UI
  fix called out in #190.
- The `mintSource` dropdown (USDC Ethereum / USDC Polygon) is still
  cosmetic; the API only takes a `currency_preference`. Either wire
  it up or remove it — separate cleanup.
- Consider moving the `localPerAcbu` / `estimateAcbuFromUsd` /
  `estimateLocalFromAcbu` helpers to `lib/rates.ts`; they're now
  duplicated across `/currency`, `/mint`, and `/`.
