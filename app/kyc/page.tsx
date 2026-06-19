'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Upload,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { get, post, patch, apiOpts } from '@/lib/api/client';
import type { UserMe } from '@/types/api';
import type { KycDocumentKind } from '@/lib/api/kyc';

const COUNTRIES: Record<string, string> = {
  NG: 'Nigeria',
  KE: 'Kenya',
  ZA: 'South Africa',
  EG: 'Egypt',
  GH: 'Ghana',
  RW: 'Rwanda',
  SN: 'Senegal',
  MA: 'Morocco',
  TZ: 'Tanzania',
  UG: 'Uganda',
};

type DocFile = { file: File | null; kind: KycDocumentKind; label: string };

export default function KycPage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [country, setCountry] = useState('NG');
  const [docs, setDocs] = useState<DocFile[]>([
    { file: null, kind: 'id_front', label: 'ID Front' },
    { file: null, kind: 'id_back', label: 'ID Back' },
    { file: null, kind: 'selfie', label: 'Selfie' },
  ]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      const u = await get<UserMe>('/users/me');
      setUser(u);
      if (u.country_code) setCountry(u.country_code);
    } catch {
      setError('Failed to load account. Are you signed in?');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleFile = (index: number, file: File | null) => {
    setDocs((prev) => prev.map((d, i) => (i === index ? { ...d, file } : d)));
  };

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const opts = apiOpts(null);

      // Try real API first
      const app = await post<{ application_id: string; status: string }>(
        '/kyc/applications',
        { country_code: country },
        opts
      );

      const docEntries: { kind: KycDocumentKind; storage_ref: string }[] = [];
      for (const doc of docs) {
        if (!doc.file) continue;
        const { upload_url, storage_ref } = await get<{
          upload_url: string;
          storage_ref: string;
        }>(
          `/kyc/applications/upload-urls?applicationId=${app.application_id}&kind=${doc.kind}`,
          opts
        );
        await fetch(upload_url, {
          method: 'PUT',
          body: doc.file,
          headers: { 'Content-Type': doc.file.type },
        });
        docEntries.push({ kind: doc.kind, storage_ref });
      }

      if (docEntries.length > 0) {
        await patch(
          `/kyc/applications/${app.application_id}/documents`,
          { documents: docEntries },
          opts
        );
      }

      setMessage('KYC application submitted! A validator will review your documents.');
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      await fetchUser();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading KYC status...</p>
      </div>
    );
  }

  const status = user?.kyc_status || 'unverified';
  const isVerified =
    status === 'verified' || status === 'enhanced' || status === 'enterprise';

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="bg-primary/10 p-1.5 rounded-full">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">KYC Verification</h1>
            <p className="text-xs text-muted-foreground">
              Verify your identity to access restricted pools
            </p>
          </div>
        </div>
      </div>

      <PageContainer>
        {/* Status Card */}
        <Card className="border-border p-4 mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-2 rounded-full ${
                isVerified ? 'bg-green-100 dark:bg-green-900' : 'bg-amber-100 dark:bg-amber-900'
              }`}
            >
              {isVerified ? (
                <Check className="w-5 h-5 text-green-700 dark:text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-foreground">Status</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {status}
              </p>
            </div>
            <Badge
              variant={isVerified ? 'default' : 'secondary'}
              className={isVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
        </Card>

        {/* Verified: link to ZK-Comply */}
        {isVerified && (
          <Card className="border-border p-6 mb-4">
            <div className="text-center space-y-3">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full inline-flex">
                <Check className="w-8 h-8 text-green-700 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold">You are verified</h2>
              <p className="text-sm text-muted-foreground">
                Your KYC is complete. Generate a ZK proof to access restricted
                pools without revealing your identity on-chain.
              </p>
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Open ZK-Comply
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Card>
        )}

        {/* Validator gateway for verified users */}
        {isVerified && (
          <Card className="border-border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium">Become a Validator</h3>
                <p className="text-xs text-muted-foreground">
                  Help verify other users. Review redacted documents — never see personal data.
                </p>
              </div>
              <Link
                href="/kyc/validator"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline shrink-0"
              >
                Start
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </Card>
        )}

        {/* Unverified: submission form */}
        {!isVerified && (
          <Card className="border-border p-6">
            <h2 className="text-base font-semibold mb-4">
              Submit Your Documents
            </h2>

            <div className="space-y-4">
              {/* Country */}
              <div>
                <label className="text-sm font-medium">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs mt-1.5 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  {Object.entries(COUNTRIES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Documents */}
              {docs.map((doc, i) => (
                <div key={doc.kind}>
                  <label className="text-sm font-medium">{doc.label}</label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center h-24 rounded-md border-2 border-dashed border-input cursor-pointer hover:border-primary/50 transition-colors">
                      {doc.file ? (
                        <div className="text-center">
                          <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <span className="text-xs text-muted-foreground">
                            {doc.file.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Upload className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-xs">Click to upload</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFile(i, e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                  {message}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || docs.every((d) => !d.file)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Submit for Verification
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Always show link to refresh status */}
        {!isVerified && message && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={fetchUser}>
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        )}
      </PageContainer>
    </>
  );
}
