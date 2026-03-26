"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import * as kycApi from "@/lib/api/kyc";
import type { KycDocumentKind } from "@/lib/api/kyc";

const KINDS: { kind: KycDocumentKind; label: string }[] = [
    { kind: "id_front", label: "ID (front)" },
    { kind: "id_back", label: "ID (back)" },
    { kind: "selfie", label: "Selfie" },
];

export default function KycUploadPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const applicationId = searchParams.get("applicationId") ?? "";
    const opts = useApiOpts();
    const [storageRefs, setStorageRefs] = useState<
        Record<KycDocumentKind, string>
    >({ id_front: "", id_back: "", selfie: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleFile = async (kind: KycDocumentKind, file: File | null) => {
        if (!applicationId || !file) return;
        setError("");
        try {
            const { upload_url, storage_ref } = await kycApi.getUploadUrl(
                applicationId,
                kind,
                opts,
            );
            const res = await fetch(upload_url, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type || "application/octet-stream",
                },
            });
            if (!res.ok) throw new Error("Upload failed");
            setStorageRefs((prev) => ({ ...prev, [kind]: storage_ref }));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const docs = KINDS.filter((k) => storageRefs[k.kind]).map((k) => ({
            kind: k.kind,
            storage_ref: storageRefs[k.kind],
        }));
        if (docs.length === 0) {
            setError("Upload at least one document");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await kycApi.patchApplicationDocuments(
                applicationId,
                { documents: docs },
                opts,
            );
            setSuccess(true);
            setTimeout(() => router.push(`/me/kyc/${applicationId}`), 1500);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Submit failed");
        } finally {
            setLoading(false);
        }
    };

    if (!applicationId) {
        return (
            <>
                <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <Link href="/me/kyc">
                            <ArrowLeft className="w-5 h-5 text-primary" />
                        </Link>
                        <h1 className="text-lg font-bold text-foreground">
                            Upload documents
                        </h1>
                    </div>
                </div>
                <PageContainer>
                    <p className="text-muted-foreground">
                        No application selected. Start a KYC application first.
                    </p>
                    <Link href="/me/kyc/start">
                        <Button variant="outline" className="mt-3">
                            Start KYC
                        </Button>
                    </Link>
                </PageContainer>
            </>
        );
    }

    return (
        <>
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="px-4 py-3 flex items-center gap-3">
                    <Link href={`/me/kyc/${applicationId}`}>
                        <ArrowLeft className="w-5 h-5 text-primary" />
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">
                        Upload documents
                    </h1>
                </div>
            </div>
            <PageContainer>
                <Card className="border-border p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Upload id_front, id_back, and selfie. Then submit.
                    </p>
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    {success && (
                        <p className="text-sm text-green-600">
                            Documents submitted.
                        </p>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {KINDS.map(({ kind, label }) => (
                            <div key={kind}>
                                <label
                                    htmlFor="upload-document"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    {label}
                                </label>
                                <input
                                    id="upload-document"
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground"
                                    onChange={(e) =>
                                        handleFile(
                                            kind,
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                {storageRefs[kind] && (
                                    <span className="text-xs text-green-600">
                                        Uploaded
                                    </span>
                                )}
                            </div>
                        ))}
                        <Button
                            type="submit"
                            disabled={loading || !storageRefs.id_front}
                        >
                            Submit documents
                        </Button>
                    </form>
                </Card>
            </PageContainer>
        </>
    );
}
