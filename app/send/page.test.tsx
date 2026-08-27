import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SendPage from './page'
import * as authContext from '@/contexts/auth-context'
import * as useBalanceHook from '@/hooks/use-balance'
import * as useApiHook from '@/hooks/use-api'
import * as transfersApi from '@/lib/api/transfers'
import * as userApi from '@/lib/api/user'

// Mock the hooks and APIs
vi.mock('@/contexts/auth-context')
vi.mock('@/hooks/use-balance')
vi.mock('@/hooks/use-api')
vi.mock('@/lib/api/transfers')
vi.mock('@/lib/api/user')
vi.mock('@/lib/stellar-wallets-kit', () => ({
  useStellarWalletsKit: () => ({
    openModal: vi.fn(),
  }),
}))
vi.mock('@/components/ui/tabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Tabs: ({ children, value, onValueChange }: { children: React.ReactNode, value: string, onValueChange: (v: string) => void }) => {
      return (
        <div data-testid="tabs">
          {React.Children.map(children, (child: unknown) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement, { activeValue: value, onValueChange });
            }
            return child;
          })}
        </div>
      );
    },
    TabsList: ({ children, activeValue, onValueChange }: { children: React.ReactNode, activeValue?: string, onValueChange?: (v: string) => void }) => (
      <div role="tablist">
        {React.Children.map(children, (child: unknown) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement, { activeValue, onValueChange });
          }
          return child;
        })}
      </div>
    ),
    TabsTrigger: ({ children, value, onValueChange }: { children: React.ReactNode, value: string, onValueChange?: (v: string) => void }) => (
      <button role="tab" onClick={() => onValueChange?.(value)}>
        {children}
      </button>
    ),
    TabsContent: ({ children, value }: { children: React.ReactNode, value: string }) => (
      <div role="tabpanel" data-testid={`tabs-content-${value}`}>
        {children}
      </div>
    ),
  };
})

/**
 * Amount preservation across the send confirmation flow.
 *
 * The "Amount" field is frozen into `confirmedAmount` the moment the confirm
 * dialog opens, so it can't drift if the underlying form state changes before
 * the transfer is actually submitted. Addresses: "Users cannot confirm how
 * much was sent".
 */
describe('SendPage — amount preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(authContext.useAuth).mockReturnValue({
      userId: 'user-1',
      stellarAddress: 'G...',
      isAuthenticated: true,
      isHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
      refreshStellarAddress: vi.fn(),
    })

    vi.mocked(useBalanceHook.useBalance).mockReturnValue({
      balance: 1000,
      loading: false,
      refresh: vi.fn(),
      error: '',
    })

    vi.mocked(useApiHook.useApiOpts).mockReturnValue({})

    vi.mocked(transfersApi.getTransfers).mockResolvedValue({ transfers: [] })
    vi.mocked(userApi.getContacts).mockResolvedValue({ contacts: [] })
  })

  async function openConfirmDialogWithAmount(value: string) {
    render(<SendPage />)
    await screen.findByText('Send Money')

    fireEvent.click(screen.getByText('New Transfer'))

    const newAddressTab = screen.getByRole('tab', { name: /New Address/i })
    fireEvent.click(newAddressTab)

    const addressInput = await screen.findByPlaceholderText('Wallet address or email')
    fireEvent.change(addressInput, { target: { value: 'target-address' } })

    const amountInput = screen.getByPlaceholderText('0.00')
    await userEvent.type(amountInput, value)

    await waitFor(() => {
      expect(screen.getByText('Continue')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByText('Continue'))

    return amountInput as HTMLInputElement
  }

  it('displays the confirmed amount, non-empty, in the confirmation dialog', async () => {
    await openConfirmDialogWithAmount('100')

    const confirmAmount = await screen.findByTestId('confirm-amount')
    expect(confirmAmount).toBeInTheDocument()
    expect(confirmAmount.textContent).not.toBe('')
    expect(confirmAmount.textContent).toContain('100')
  })

  it('preserves the amount in the form after canceling confirmation', async () => {
    const amountInput = await openConfirmDialogWithAmount('50')

    const alertDialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(alertDialog).getByText('Cancel'))

    expect(amountInput).toHaveValue(50)

    // Re-opening confirm should show the same amount again.
    fireEvent.click(screen.getByText('Continue'))
    const confirmAmount = await screen.findByTestId('confirm-amount')
    expect(confirmAmount.textContent).toContain('50')
  })

  it('clears the amount after a successful transfer', async () => {
    vi.mocked(transfersApi.createTransfer).mockResolvedValue({
      transaction_id: 'tx-1',
      status: 'completed',
    })

    await openConfirmDialogWithAmount('25')

    const alertDialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(alertDialog).getByText(/Send ACBU 25/i))

    await screen.findByText('Transfer Sent!')

    // The success dialog auto-closes and clears the form after 2.5s; the send
    // dialog (and its amount input) unmounts along with it, so re-open it to
    // check the form was actually reset rather than reading a stale node.
    await waitFor(
      () => {
        expect(screen.queryByText('Transfer Sent!')).not.toBeInTheDocument()
      },
      { timeout: 4000 },
    )
    fireEvent.click(screen.getByText('New Transfer'))
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(null)
  }, 8000)
})
