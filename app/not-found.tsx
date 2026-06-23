import Image from 'next/image';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Image
        src="/placeholder-logo.svg"
        alt="ACBU logo"
        width={120}
        height={27}
        priority
        className="dark:invert"
      />

      <div className="rounded-full bg-primary/10 p-4">
        <FileQuestion className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Error 404
        </p>
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <Button asChild>
        <Link href="/">
          <Home className="w-4 h-4 mr-2" />
          Go to dashboard
        </Link>
      </Button>
    </div>
  );
}
