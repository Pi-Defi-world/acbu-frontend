'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { useI18n } from '@/contexts/i18n-context';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const { t } = useI18n();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-md">
      <WifiOff className="h-4 w-4" />
      <span>{t('offline.youAreOffline')}</span>
    </div>
  );
}
