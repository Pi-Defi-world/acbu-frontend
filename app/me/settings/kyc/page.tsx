'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, FileImage, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { get } from '@/lib/api/client';
import {
  createApplication,
  getUploadUrl,
  patchApplicationDocuments,
  type KycDocumentKind,
} from '@/lib/api/kyc';

const KYC_LABELS: Record<string, string> = {
  unverified: 'Unverified',
  pending: 'Pending Review',
  verified: 'Verified',
  enhanced: 'Enhanced',
  enterprise: 'Enterprise',
  rejected: 'Rejected',
};

const COUNTRY_OPTIONS = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'GH', name: 'Ghana' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SN', name: 'Senegal (XOF)' },
  { code: 'MA', name: 'Morocco' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
];

type DocState = {
  file: File | null;
  uploading: boolean;
  storageRef: string | null;
  error: string | null;
};

const initialDocs: Record<KycDocumentKind, DocState> = {
  id_front: { file: null, uploading: false, storageRef: null, error: null },
  id_back: { file: null, uploading: false, storageRef: null, error: null },
  selfie: { file: null, uploading: false, storageRef: null, error: null },
};

export default function KycPage() {
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('NG');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRefs = useRef<Record<KycDocumentKind, HTMLInputElement | null>>({
    id_front: null,
    id_back: null,
    selfie: null,
  });

  useEffect(() => {
    get<{ kyc_status?: string; country_code?: string }>('/users/me')
      .then((u) => {
        setKycStatus(u.kyc_status || 'unverified');
        if (u.country_code) setCountryCode(u.country_code);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleFileSelect =
    (kind: KycDocumentKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setDocs((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], file, error: null },
      }));
    };

  const uploadDoc = async (kind: KycDocumentKind) => {
    const doc = docs[kind];
    if (!doc.file || !appId) return;

    setDocs((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], uploading: true, error: null },
    }));

    try {
      const { upload_url, storage_ref } = await getUploadUrl(appId, kind);
      const res = await fetch(upload_url, {
        method: 'PUT',
        body: doc.file,
        headers: { 'Content-Type': doc.file.type },
      });
      if (!res.ok) throw new Error('Upload failed');

      setDocs((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], uploading: false, storageRef: storage_ref },
      }));
    } catch (e: any) {
      setDocs((prev) => ({
        ...prev,
        [kind]: {
          ...prev[kind],
          uploading: false,
          error: e.message || 'Upload failed',
        },
      }));
    }
  };

  const handleCreateApplication = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createApplication({ country_code: countryCode });
      setAppId(result.application_id);
    } catch (e: any) {
      setError(e.message || 'Failed to create application');
    }
    setSubmitting(false);
  };

  const handleSubmitDocs = async () => {
    if (!appId) return;
    setSubmitting(true);
    setError(null);

    try {
      const docList = (Object.entries(docs) as [KycDocumentKind, DocState][])
        .filter(([, d]) => d.storageRef)
        .map(([kind, d]) => ({
          kind,
          storage_ref: d.storageRef!,
          mime_type: d.file?.type || 'image/jpeg',
        }));

      if (docList.length < 3) {
        setError('Upload all 3 documents first');
        setSubmitting(false);
        return;
      }

      await patchApplicationDocuments(appId, { documents: docList });
      setSuccess(true);
      setKycStatus('pending');
    } catch (e: any) {
      setError(e.message || 'Failed to submit documents');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
          <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        </div>
      </PageContainer>
    );
  }

  const kycLabel = KYC_LABELS[kycStatus || ''] || kycStatus || 'Unknown';
  const isVerified = kycStatus === 'verified' || kycStatus === 'enhanced' || kycStatus === 'enterprise';
  const isPending = kycStatus === 'pending';

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">KYC Verification</h1>
        </div>
      </div>
      <PageContainer>
        <div className="space-y-4">
          {/* Status Card */}
          <Card className="border-border p-4">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-full ${
                  isVerified
                    ? 'bg-green-100 dark:bg-green-900'
                    : isPending
                    ? 'bg-amber-100 dark:bg-amber-900'
                    : 'bg-secondary'
                }`}
              >
                <ShieldCheck
                  className={`w-5 h-5 ${
                    isVerified
                      ? 'text-green-700 dark:text-green-400'
                      : isPending
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-foreground">KYC Status</h2>
                <p className="text-sm text-muted-foreground">
                  Required to access compliance-gated pools.
                </p>
              </div>
              <Badge
                variant={isVerified ? 'default' : 'secondary'}
                className={
                  isVerified
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                    : isPending
                    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400'
                    : ''
                }
              >
                {kycLabel}
              </Badge>
            </div>
          </Card>

          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              KYC application submitted. Your identity will be reviewed shortly.
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Step 1: Country */}
          {!appId && !isVerified && !isPending && !success && (
            <Card className="border-border p-4 space-y-3">
              <div>
                <h2 className="font-medium text-foreground">Step 1: Select Country</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your jurisdiction determines which pools you can access.
                </p>
              </div>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleCreateApplication}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Start KYC Application
              </Button>
            </Card>
          )}

          {/* Step 2: Upload Documents */}
          {appId && !success && (
            <Card className="border-border p-4 space-y-4">
              <div>
                <h2 className="font-medium text-foreground">
                  Step 2: Upload Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload clear photos of your ID (front and back) and a selfie.
                </p>
              </div>

              {(
                [
                  ['id_front', 'ID Front'],
                  ['id_back', 'ID Back'],
                  ['selfie', 'Selfie'],
                ] as [KycDocumentKind, string][]
              ).map(([kind, label]) => {
                const doc = docs[kind];
                return (
                  <div key={kind} className="space-y-2">
                    <label className="text-sm font-medium">{label}</label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => {
                        fileRefs.current[kind] = el;
                      }}
                      onChange={handleFileSelect(kind)}
                      className="hidden"
                    />
                    {doc.file ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-2 text-sm">
                          <FileImage className="w-4 h-4 text-muted-foreground" />
                          <span className="truncate">{doc.file.name}</span>
                          {doc.storageRef && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        {doc.uploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : doc.storageRef ? null : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => uploadDoc(kind)}
                          >
                            Upload
                          </Button>
                        )}
                        <button
                          onClick={() => {
                            setDocs((prev) => ({
                              ...prev,
                              [kind]: initialDocs[kind],
                            }));
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRefs.current[kind]?.click()}
                        className="flex items-center gap-2 w-full rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Choose {label.toLowerCase()} image
                      </button>
                    )}
                    {doc.error && (
                      <p className="text-xs text-destructive">{doc.error}</p>
                    )}
                  </div>
                );
              })}

              <Button
                onClick={handleSubmitDocs}
                disabled={
                  submitting ||
                  !Object.values(docs).every((d) => d.storageRef)
                }
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Submit for Review
              </Button>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
