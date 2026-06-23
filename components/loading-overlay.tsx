import { Spinner } from '@/components/ui/spinner'

interface LoadingOverlayProps {
  loading: boolean
  children?: React.ReactNode
}

/**
 * Full-screen loading overlay.
 * Uses `pointer-events-none` on the backdrop so underlying content
 * (e.g. a Cancel button) remains interactive during loading (#490).
 */
export function LoadingOverlay({ loading, children }: LoadingOverlayProps) {
  if (!loading) return null

  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
    >
      {children ?? <Spinner className="size-8" />}
    </div>
  )
}
