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
