'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Upload,
  Clock,
  FileText,
} from 'lucide-react';

interface KYCDocument {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedDate?: string;
  verifiedDate?: string;
}

export default function KYCPage() {
  const [documents, setDocuments] = useState<KYCDocument[]>([
    {
      id: '1',
      name: 'Identity Document',
      type: 'passport',
      status: 'verified',
      uploadedDate: '2024-01-10',
      verifiedDate: '2024-01-15',
    },
    {
      id: '2',
      name: 'Proof of Address',
      type: 'utility_bill',
      status: 'verified',
      uploadedDate: '2024-01-10',
      verifiedDate: '2024-01-15',
    },
    {
      id: '3',
      name: 'Proof of Income',
      type: 'income_doc',
      status: 'uploaded',
      uploadedDate: '2024-02-01',
    },
  ]);

  const kycStatus = 'verified';
  const kycLevel: number = 2;
  const maxLevel = 3;

  const statusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600';
      case 'uploaded':
        return 'text-blue-600';
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'uploaded':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Upload className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
          <Link href="/account">
            <ArrowLeft className="w-5 h-5 text-primary hover:text-primary/80" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">KYC Verification</h1>
        </div>

        {/* Status Card */}
        <div className="px-4 py-6">
          <Card className="border-border p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Verification Level
                </h2>
                <span className="text-sm font-medium text-primary">
                  Level {kycLevel} of {maxLevel}
                </span>
              </div>
              <Progress value={(kycLevel / maxLevel) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {kycLevel === 3
                  ? 'Fully verified'
                  : `Complete level ${kycLevel + 1} for higher limits`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-foreground">
                  Level 1: Identity verified
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-foreground">
                  Level 2: Address verified
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Level 3: Income verification (optional)
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Documents Section */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Uploaded Documents
          </h2>

          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="border-border p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-foreground">
                        {doc.name}
                      </h3>
                      <div className={`flex items-center gap-1 text-xs font-medium ${statusColor(doc.status)}`}>
                        {statusIcon(doc.status)}
                        <span className="capitalize">{doc.status}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploadedDate &&
                        `Uploaded: ${new Date(doc.uploadedDate).toLocaleDateString()}`}
                      {doc.verifiedDate &&
                        ` • Verified: ${new Date(doc.verifiedDate).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-6 border-border text-primary hover:bg-muted bg-transparent"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Additional Document
          </Button>
        </div>

        {/* FAQ Section */}
        <div className="px-4 py-6 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {[
              {
                q: 'How long does verification take?',
                a: 'Level 1 & 2 typically take 1-24 hours. Level 3 may take 3-5 business days.',
              },
              {
                q: 'What documents do I need?',
                a: 'Valid ID, proof of address, and (for Level 3) proof of income such as payslips or tax returns.',
              },
              {
                q: 'Can I reupload if rejected?',
                a: 'Yes, rejected documents can be corrected and resubmitted immediately.',
              },
            ].map((faq, idx) => (
              <details key={idx} className="group">
                <summary className="cursor-pointer flex items-start gap-2 py-2">
                  <span className="text-sm font-medium text-foreground">
                    {faq.q}
                  </span>
                </summary>
                <p className="text-sm text-muted-foreground pl-2 pb-3">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
