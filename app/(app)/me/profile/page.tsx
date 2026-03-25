"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';
import type { UserMe, PatchMeBody } from '@/types/api';

export default function ProfilePage() {
    const opts = useApiOpts();
    const [user, setUser] = useState<UserMe | null>(null);
    const [formData, setFormData] = useState<{
        username: string;
        email: string;
        phone_e164: string;
        privacy_hide_from_search: boolean;
    }>({
        username: "",
        email: "",
        phone_e164: "",
        privacy_hide_from_search: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        userApi
            .getMe(opts)
            .then((data) => {
                if (!cancelled) {
                    setUser(data);
                    setFormData({
                        username: data.username ?? "",
                        email: data.email ?? "",
                        phone_e164: data.phone_e164 ?? "",
                        privacy_hide_from_search:
                            data.privacy_hide_from_search ?? false,
                    });
                }
            })
            .catch((e) => {
                if (!cancelled)
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Failed to load profile",
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [opts.token]);

    const handleChange = (
        field: keyof typeof formData,
        value: string | boolean,
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
          <Link href="/me"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
        <PageContainer>
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </PageContainer>
      </>
    );
  }

    if (loading) {
        return (
            <>
                <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
                    <Link href="/me">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">
                        Profile
                    </h1>
                </div>
                <PageContainer>
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-muted rounded" />
                        <div className="h-10 bg-muted rounded" />
                    </div>
                </PageContainer>
            </>
        );
    }

    if (error && !user) {
        return (
            <>
                <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
                    <Link href="/me">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">
                        Profile
                    </h1>
                </div>
                <PageContainer>
                    <p className="text-destructive">{error}</p>
                </PageContainer>
            </>
        );
    }

    return (
        <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
                <Link href="/me">
                    <ArrowLeft className="w-5 h-5 text-primary hover:text-primary/80" />
                </Link>
                <h1 className="text-xl font-bold text-foreground">Profile</h1>
            </div>

            <PageContainer>
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    {saved && (
                        <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700 dark:border-green-800 dark:bg-green-950">
                            Profile updated successfully
                        </div>
                    )}
                    <div>
                        <label
                            htmlFor="profile-username"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Username
                        </label>
                        <Input
                            id="profile-username"
                            type="text"
                            value={formData.username}
                            onChange={(e) =>
                                handleChange("username", e.target.value)
                            }
                            className="border-border"
                            placeholder="Username"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-email"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Email
                        </label>
                        <Input
                            id="profile-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                handleChange("email", e.target.value)
                            }
                            className="border-border"
                            placeholder="your@email.com"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="profile-phone"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Phone (E.164)
                        </label>
                        <Input
                            id="profile-phone"
                            type="tel"
                            value={formData.phone_e164}
                            onChange={(e) =>
                                handleChange("phone_e164", e.target.value)
                            }
                            className="border-border"
                            placeholder="+2348012345678"
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.privacy_hide_from_search}
                            onChange={(e) =>
                                handleChange(
                                    "privacy_hide_from_search",
                                    e.target.checked,
                                )
                            }
                            className="rounded border-border"
                        />
                        <span className="text-sm text-foreground">
                            Hide from search
                        </span>
                    </label>
                    <Card className="border-border bg-muted p-4 mt-6">
                        <p className="text-xs text-muted-foreground mb-2">
                            Account status
                        </p>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    Email verified
                                </span>
                                <span
                                    className={
                                        user?.email_verified_at
                                            ? "text-green-600 font-medium"
                                            : "text-muted-foreground"
                                    }
                                >
                                    {user?.email_verified_at ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    Phone verified
                                </span>
                                <span
                                    className={
                                        user?.phone_verified_at
                                            ? "text-green-600 font-medium"
                                            : "text-muted-foreground"
                                    }
                                >
                                    {user?.phone_verified_at ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    KYC status
                                </span>
                                <span className="text-foreground">
                                    {user?.kyc_status ?? "—"}
                                </span>
                            </div>
                        </div>
                    </Card>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </PageContainer>
        </>
    );
}
