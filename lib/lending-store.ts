/**
 * Local persistence for submitted loan applications.
 *
 * Why: the `/lending/apply` backend endpoint may not be live yet, but the MVP
 * requires submitted applications to be visible in an admin/backoffice stub.
 * localStorage is authoritative for the stub; the backend is called opportunistically.
 */

export type LoanApplicationStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected';

export interface StoredLoanApplication {
  id: string;
  productId: string;
  productName: string;
  amount: number;
  term: number;
  purpose?: string;
  applicantUser?: string;
  status: LoanApplicationStatus;
  syncedWithBackend: boolean;
  submittedAt: string;
  errorMessage?: string;
}

const STORAGE_KEY = 'acbu:lending:applications';

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function listApplications(): StoredLoanApplication[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is StoredLoanApplication =>
      !!a && typeof a === 'object' && typeof (a as StoredLoanApplication).id === 'string'
    );
  } catch {
    return [];
  }
}

export function saveApplication(app: StoredLoanApplication): StoredLoanApplication[] {
  if (!hasWindow()) return [];
  const current = listApplications();
  const next = [app, ...current.filter((a) => a.id !== app.id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function updateApplicationStatus(
  id: string,
  status: LoanApplicationStatus
): StoredLoanApplication[] {
  if (!hasWindow()) return [];
  const current = listApplications();
  const next = current.map((a) => (a.id === id ? { ...a, status } : a));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

// ─── Active Loans (local cache for offline/stub support) ─────────────────────

export interface StoredActiveLoan {
  loan_id: string;
  product_id: string;
  product_name?: string;
  principal: number;
  outstanding: number;
  term_months: number;
  rate_pct: number;
  status: 'active' | 'repaid' | 'defaulted';
  disbursed_at: string;
  due_at?: string;
}

const LOANS_KEY = 'acbu:lending:active_loans';

export function listActiveLoans(): StoredActiveLoan[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(LOANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is StoredActiveLoan =>
        !!l && typeof l === 'object' && typeof (l as StoredActiveLoan).loan_id === 'string'
    );
  } catch {
    return [];
  }
}

export function upsertActiveLoan(loan: StoredActiveLoan): StoredActiveLoan[] {
  if (!hasWindow()) return [];
  const current = listActiveLoans();
  const next = [loan, ...current.filter((l) => l.loan_id !== loan.loan_id)];
  window.localStorage.setItem(LOANS_KEY, JSON.stringify(next));
  return next;
}

export function recordRepayment(
  loan_id: string,
  amount: number
): StoredActiveLoan[] {
  if (!hasWindow()) return [];
  const current = listActiveLoans();
  const next = current.map((l) => {
    if (l.loan_id !== loan_id) return l;
    const outstanding = Math.max(0, l.outstanding - amount);
    return { ...l, outstanding, status: outstanding === 0 ? ('repaid' as const) : l.status };
  });
  window.localStorage.setItem(LOANS_KEY, JSON.stringify(next));
  return next;
}