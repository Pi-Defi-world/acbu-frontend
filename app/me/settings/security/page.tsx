'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import * as userApi from '@/lib/api/user';
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');

    try {
      await userApi.deleteMe();
      await logout();
      router.replace('/auth/signin');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete account. Please try again.',
      );
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings" aria-label="Back to settings">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Security</h1>
            <p className="text-sm text-muted-foreground">
              Account security settings
            </p>
          </div>
        </div>
      </div>

      <PageContainer>
        <div className="space-y-4">
          <Card className="border-border p-4">
            <h2 className="text-base font-medium text-foreground">
              Security controls unavailable
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Session management, API key management, and changing two-factor
              authentication are not available here. No security changes are
              made from this page.
            </p>
          </Card>

          <Card className="border-destructive/20 border p-4">
            <div className="flex items-start gap-4">
              <div className="bg-destructive/10 p-2 rounded-full mt-0.5">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h2 className="text-base font-medium text-destructive">
                    Delete account
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and associated data. This
                    action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and associated data. You
              cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Confirm deletion'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}