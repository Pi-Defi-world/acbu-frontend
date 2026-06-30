/**
 * Barrel export for /components
 *
 * All public component exports are named exports.
 * Next.js pages (app/) remain default-exported as required by the framework.
 */

// Root-level components
export { AppLayout } from './app-layout';
export { ErrorBoundary } from './error-boundary';
export { ErrorTestTrigger } from './error-test-trigger';
export { GlobalErrorHandler } from './global-error-handler';
export { MobileNav } from './mobile-nav';
export { OfflineIndicator } from './offline-indicator';
export { PageTransition } from './page-transition';
export { SessionExpiryWarning } from './session-expiry-warning';
export { ThemeProvider } from './theme-provider';
export { UserMenu } from './user-menu';
export { WalletSetupModal } from './wallet-setup-modal';

// Layout
export { AuthGuard } from './layout/auth-guard';
export { PageContainer } from './layout/page-container';

// Navigation
export { BackButton } from './navigation/BackButton';

// Onboarding
export { OnboardingAudio, OnboardingVideo } from './onboarding/media';
export { OnboardingVideo as OnboardingVideoPlayer } from './onboarding/onboarding-video';

// Chat
export { ChatMessage } from './chat/ChatMessage';
