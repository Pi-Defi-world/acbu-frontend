/**
 * API request/response types (snake_case to match backend).
 */

// Auth
export interface SigninResponse {
  api_key?: string;  // Deprecated: now returned via httpOnly cookie only
  user_id: string;
  wallet_created?: boolean;
  passphrase?: string;
  encryption_method_required?: boolean;
}

export interface SigninRequires2FA {
  requires_2fa: true;
  challenge_token: string;
}

// User
export interface UserMe {
  user_id: string;
  username?: string;
  email?: string;
  phone_e164?: string;
  email_verified_at?: string;
  phone_verified_at?: string;
  privacy_hide_from_search?: boolean;
  kyc_status?: string;
  country_code?: string;
  created_at: string;
}

export interface PatchMeBody {
  username?: string;
  email?: string | null;
  phone_e164?: string | null;
  privacy_hide_from_search?: boolean;
  passcode?: string;
}

export interface ReceiveResponse {
  pay_uri?: string;
  alias?: string;
  [key: string]: unknown;
}

// Balance
export interface BalanceResponse {
  balance: string | number;
  currency?: string;
}

// Contacts & guardians
export interface ContactItem {
  id: string;
  alias?: string;
  pay_uri?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface GuardianItem {
  id: string;
  [key: string]: unknown;
}

// Transfers
export interface TransferItem {
  transaction_id: string;
  status: string;
  amount_acbu: string | null;
  recipient_address: string | null;
  blockchain_tx_hash?: string;
  created_at: string;
  completed_at?: string;
}

export interface TransfersListResponse {
  transfers: TransferItem[];
}

export interface CreateTransferBody {
  to: string;
  amount_acbu: string;
  note?: string;
}

export interface CreateTransferResponse {
  transaction_id: string;
  status: string;
}

// Transactions
export interface TransactionDetail {
  transaction_id: string;
  type: string;
  status: string;
  amount_acbu?: string | null;
  usdc_amount?: string | null;
  local_amount?: string | null;
  currency?: string;
  created_at: string;
  completed_at?: string;
  blockchain_tx_hash?: string;
  [key: string]: unknown;
}

// Mint
export interface MintFromUsdcBody {
  usdc_amount: string;
  wallet_address: string;
  currency_preference?: 'auto';
}

export interface MintResponse {
  transaction_id: string;
  acbu_amount: string | null;
  usdc_amount: string;
  fee: string;
  rate: { acbu_usd: number | null; timestamp: string };
  status: string;
  estimated_completion?: string | null;
  blockchain_tx_hash?: string;
}

// Burn
export interface BurnRecipientAccount {
  type?: 'bank' | 'mobile_money';
  account_number: string;
  bank_code: string;
  account_name: string;
}

export interface BurnAcbuBody {
  acbu_amount: string;
  currency: string;
  recipient_account: BurnRecipientAccount;
}

export interface BurnResponse {
  transaction_id: string;
  acbu_amount: string;
  local_amount: string | null;
  currency: string;
  fee: string;
  rate: { acbu_ngn: number | null; timestamp: string };
  status: string;
  estimated_completion?: string | null;
  blockchain_tx_hash?: string;
}

// Rates
export interface RatesResponse {
  rates?: Array<{ currency: string; rate?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface QuoteResponse {
  amount?: number;
  currency?: string;
  acbu_amount?: string;
  [key: string]: unknown;
}

// Reserves
export interface ReservesResponse {
  reserve_ratio?: number;
  health?: string;
  [key: string]: unknown;
}

// Savings
export interface SavingsPositionsResponse {
  user: string;
  term_seconds: number | null;
  balance: string | number;
}

export interface SavingsDepositBody {
  user: string;
  amount: string | number;
  term_seconds: number;
}

export interface SavingsWithdrawBody {
  user: string;
  term_seconds: number;
  amount: string | number;
}

// Lending
export interface LendingBalanceResponse {
  lender: string;
  balance: string | number;
}

export interface LendingDepositBody {
  lender: string;
  amount: string | number;
}

export interface LendingWithdrawBody {
  lender: string;
  amount: string | number;
}
export interface ApplyLoanBody {
  productId: string;
  amount: number;
  term: number;
}

// Recipient
export interface RecipientResponse {
  resolved?: boolean;
  pay_uri?: string;
  alias?: string;
  [key: string]: unknown;
}

// Recovery (no API key)
export interface RecoveryUnlockBody {
  recovery_code?: string;
  guardian_approvals?: unknown[];
  [key: string]: unknown;
}

// KYC
export interface KycApplication {
  id: string;
  status?: string;
  [key: string]: unknown;
}

export interface KycApplicationsResponse {
  applications?: KycApplication[];
}

// Gateway, Bills – generic for stubs
export interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}
