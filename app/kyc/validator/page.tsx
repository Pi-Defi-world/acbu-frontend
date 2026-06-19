'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Check,
  X,
  Eye,
  EyeOff,
  UserCheck,
  FileCheck,
  Camera,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { get, post, apiOpts } from '@/lib/api/client';

interface RedactedTask {
  taskId: string;
  countryCode: string;
  machineConfidence: number;
  submittedAt: string;
  validatorCount: number;
  redacted: {
    idType: string;
    idValidity: { hasHologram: boolean; hasWatermark: boolean; formatValid: boolean; expiryDate: string };
    faceMatch: { idPhotoRef: string; selfieRef: string };
    livenessCheck: { blinked: boolean; smiled: boolean; passed: boolean };
    humanReadable: { country: string; name: string; dateOfBirth: string; idNumber: string; address: string };
  };
}

interface Dashboard {
  tasks: RedactedTask[];
  trustScore: number;
}

export default function ValidatorPage() {
  const [agreed, setAgreed] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await get<Dashboard>('/kyc/validator/dashboard', apiOpts(null));
      setDashboard(data);
    } catch (e: any) {
      if (e.status === 403) setError('Complete your own KYC first, then register as a validator.');
      else setError(e.message || 'Failed to load tasks');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (agreed) fetchDashboard();
  }, [agreed, fetchDashboard]);

  const handleVerdict = async (taskId: string, verdict: 'approved' | 'rejected') => {
    setSubmitting(taskId);
    setResult('');
    try {
      await post(`/kyc/validator/tasks/${taskId}`, { result: verdict, notes }, apiOpts(null));
      setResult(verdict === 'approved' ? 'Approved — thank you for helping secure the network.' : 'Rejected — the application will be reviewed by another validator.');
      setNotes('');
      fetchDashboard();
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(null);
  };

  // ── Consent Gate ──
  if (!agreed) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Validator</h1>
              <p className="text-xs text-muted-foreground">Help secure the network</p>
            </div>
          </div>
        </div>
        <PageContainer>
          <Card className="border-border p-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="bg-primary/10 p-4 rounded-full inline-flex">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Become a Validator</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                As a KYC'd member of ACBU, you can help verify other users' identities.
                You'll review anonymized, redacted documents — never seeing anyone's
                personal information.
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-3 text-sm">
              <h3 className="font-semibold">Validator Agreement</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">1.</span>
                  You will only review applications from your own country.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">2.</span>
                  All personal data (names, ID numbers, addresses) is automatically redacted.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">3.</span>
                  You'll compare document validity and face matches — never see full profiles.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">4.</span>
                  Multiple validators must agree. Your accuracy score affects your eligibility.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">5.</span>
                  Deliberately false validations will lower your trust score and disqualify you.
                </li>
              </ul>
            </div>

            <Button className="w-full" size="lg" onClick={() => setAgreed(true)}>
              <FileCheck className="w-4 h-4 mr-2" />
              I Agree — Start Validating
            </Button>
          </Card>
        </PageContainer>
      </>
    );
  }

  // ── Dashboard ──
  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/kyc">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Validator Dashboard</h1>
            <p className="text-xs text-muted-foreground">Review anonymized applications</p>
          </div>
          {dashboard && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Trust: {Math.round(dashboard.trustScore * 100)}%
            </Badge>
          )}
        </div>
      </div>
      <PageContainer>
        {loading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive/20 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          </Card>
        )}

        {result && (
          <Card className="border-green-200 bg-green-50 p-4 mb-4 dark:border-green-800 dark:bg-green-950">
            <div className="flex items-center gap-3 text-sm text-green-800 dark:text-green-400">
              <Check className="w-5 h-5" />
              {result}
            </div>
          </Card>
        )}

        {dashboard && dashboard.tasks.length === 0 && (
          <Card className="border-border p-10 text-center">
            <div className="bg-secondary p-4 rounded-full inline-flex mb-4">
              <Check className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">All Caught Up</h2>
            <p className="text-sm text-muted-foreground">
              No pending applications in your country. Check back later.
            </p>
            <Button variant="outline" className="mt-4" onClick={fetchDashboard}>
              Refresh
            </Button>
          </Card>
        )}

        {dashboard && dashboard.tasks.map((task) => (
          <Card key={task.taskId} className="border-border mb-4 overflow-hidden">
            {/* Task Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {task.redacted.humanReadable.country}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {task.redacted.idType.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(task.submittedAt).toLocaleDateString()} · 
                    AI confidence: {Math.round(task.machineConfidence * 100)}% · 
                    {task.validatorCount} validator{task.validatorCount !== 1 ? 's' : ''} so far
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpandedTask(expandedTask === task.taskId ? null : task.taskId)
                }
              >
                {expandedTask === task.taskId ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Expanded: Redacted Document Review */}
            {expandedTask === task.taskId && (
              <div className="border-t border-border p-4 space-y-4 bg-secondary/20">
                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  All personal data is redacted. You only see what's needed to verify.
                </p>

                {/* Redacted Personal Info */}
                <div className="rounded-md border bg-background p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(task.redacted.humanReadable).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {k.replace(/([A-Z])/g, ' $1')}:
                        </span>
                        <span className={v === 'REDACTED' ? 'text-muted-foreground/50 font-mono text-xs' : ''}>
                          {v === 'REDACTED' ? '█'.repeat(10) : v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document Validity Check */}
                <div className="rounded-md border bg-background p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    Document Validity
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.idValidity.formatValid ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.idValidity.formatValid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Format valid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.idValidity.hasHologram ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.idValidity.hasHologram ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Hologram detected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.idValidity.hasWatermark ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.idValidity.hasWatermark ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Watermark detected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Expires: {task.redacted.idValidity.expiryDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Face Match */}
                <div className="rounded-md border bg-background p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    Face Comparison
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="aspect-[3/4] rounded-md bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                        <div className="text-center text-muted-foreground">
                          <UserCheck className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-xs">ID Photo</span>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            Cropped from document
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="aspect-[3/4] rounded-md bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                        <div className="text-center text-muted-foreground">
                          <Camera className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-xs">Selfie</span>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            Liveness video frame
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Compare the two faces. Are they the same person?
                  </p>
                </div>

                {/* Liveness Check */}
                <div className="rounded-md border bg-background p-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Liveness Verification
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.livenessCheck.blinked ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.livenessCheck.blinked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Blinked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.livenessCheck.smiled ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.livenessCheck.smiled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Smiled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={task.redacted.livenessCheck.passed ? 'text-green-600' : 'text-red-600'}>
                        {task.redacted.livenessCheck.passed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </span>
                      <span className="text-muted-foreground">Liveness OK</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Verdict */}
                <div className="space-y-3">
                  <textarea
                    placeholder="Optional notes for other validators..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                      onClick={() => handleVerdict(task.taskId, 'approved')}
                      disabled={submitting === task.taskId}
                    >
                      {submitting === task.taskId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                      onClick={() => handleVerdict(task.taskId, 'rejected')}
                      disabled={submitting === task.taskId}
                    >
                      {submitting === task.taskId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </PageContainer>
    </>
  );
}
