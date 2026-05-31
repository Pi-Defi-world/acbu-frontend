import { render, screen, fireEvent } from '@testing-library/react'
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
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode, open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('SendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    vi.mocked(authContext.useAuth).mockReturnValue({
      userId: 'user-1',
      stellarAddress: 'G...',
      isAuthenticated: true,
      isHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
      refreshStellarAddress: vi.fn(),
      apiKey: 'key',
    })

    vi.mocked(useBalanceHook.useBalance).mockReturnValue({
      balance: 100,
      loading: false,
      refresh: vi.fn(),
      error: '',
    })

    vi.mocked(useApiHook.useApiOpts).mockReturnValue({
      token: 'test-token',
    })

    vi.mocked(transfersApi.getTransfers).mockResolvedValue({ transfers: [] })
    vi.mocked(userApi.getContacts).mockResolvedValue({ contacts: [] })
  })

  it('renders the send money page', async () => {
    render(<SendPage />)
    expect(await screen.findByText('Send Money')).toBeInTheDocument()
    expect(screen.getByText('New Transfer')).toBeInTheDocument()
  })

  it('shows balance correctly', async () => {
    render(<SendPage />)
    await screen.findByText('Send Money')
    
    // The dialog needs to be opened to see the balance in the form
    fireEvent.click(screen.getByText('New Transfer'))
    expect(screen.getByText(/Available: ACBU 100/)).toBeInTheDocument()
  })

  it('validates amount exceeds balance', async () => {
    render(<SendPage />)
    await screen.findByText('Send Money')
    
    fireEvent.click(screen.getByText('New Transfer'))
    
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '150' } })
    
    expect(screen.getByText('Insufficient balance.')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeDisabled()
  })

  it('enables continue button when form is valid', async () => {
    render(<SendPage />)
    await screen.findByText('Send Money')
    
    fireEvent.click(screen.getByText('New Transfer'))
    
    // Switch to custom address tab
    const newAddressTab = screen.getByRole('tab', { name: /New Address/i })
    fireEvent.click(newAddressTab)
    
    const addressInput = await screen.findByPlaceholderText('Wallet address or email')
    fireEvent.change(addressInput, { target: { value: 'target-address' } })
    
    const amountInput = screen.getByPlaceholderText('0.00')
    fireEvent.change(amountInput, { target: { value: '50' } })
    
    expect(screen.getByText('Continue')).not.toBeDisabled()
  })
})
