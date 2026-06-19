'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';

export default function WalletSetupPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push('/'), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full inline-flex">
          <Check className="w-10 h-10 text-green-700 dark:text-green-400" />
        </div>
        <h1 className="text-xl font-bold">Wallet Created</h1>
        <p className="text-muted-foreground">
          Your Stellar wallet has been created. Redirecting to your dashboard...
        </p>
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    </div>
  );
}
