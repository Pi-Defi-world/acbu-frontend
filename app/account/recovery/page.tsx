"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, CheckCircle, Lock } from "lucide-react";

export default function RecoveryPage() {
    const [step, setStep] = useState<"method" | "verify" | "reset" | "success">(
        "method",
    );
    const [recoveryMethod, setRecoveryMethod] = useState<string>("email");
    const [verificationCode, setVerificationCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleMethodSelect = () => {
        console.log("[v0] Recovery method selected:", recoveryMethod);
        setStep("verify");
    };

    const handleVerifyCode = async () => {
        setError("");
        setLoading(true);
        if (!verificationCode || verificationCode.length !== 6) {
            setError("Please enter a valid 6-digit code");
            setLoading(false);
            return;
        }
        console.log("[v0] Code verification:", verificationCode);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStep("reset");
        setLoading(false);
    };

    const handleResetPassword = async () => {
        setError("");
        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        setLoading(true);
        console.log("[v0] Password reset attempt");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStep("success");
        setLoading(false);
    };

    return (
        <AppLayout>
            <div className="pb-20">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-6 border-b border-border">
                    <Link href="/account">
                        <ArrowLeft className="w-5 h-5 text-primary hover:text-primary/80" />
                    </Link>
                    <h1 className="text-xl font-bold text-foreground">
                        Account Recovery
                    </h1>
                </div>

                <div className="px-4 py-6 max-w-md mx-auto">
                    {/* Step 1: Choose Recovery Method */}
                    {step === "method" && (
                        <div className="space-y-4">
                            <Card className="border-border p-4">
                                <h2 className="font-semibold text-foreground mb-4">
                                    Choose recovery method
                                </h2>
                                <div className="space-y-2">
                                    {[
                                        {
                                            id: "email",
                                            label: "Email",
                                            description:
                                                "Receive code at john@example.com",
                                        },
                                        {
                                            id: "phone",
                                            label: "SMS",
                                            description:
                                                "Receive code at +234 (0) 123 456 7890",
                                        },
                                        {
                                            id: "guardian",
                                            label: "Guardian",
                                            description:
                                                "Request recovery from your guardian",
                                        },
                                    ].map((method) => (
                                        <label
                                            key={method.id}
                                            className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                        >
                                            <input
                                                type="radio"
                                                name="recovery"
                                                value={method.id}
                                                checked={
                                                    recoveryMethod === method.id
                                                }
                                                onChange={(e) =>
                                                    setRecoveryMethod(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-4 h-4"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {method.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {method.description}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </Card>

                            <Button
                                onClick={handleMethodSelect}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Continue
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Or{" "}
                                <Link
                                    href="/auth/signin"
                                    className="text-primary hover:text-primary/80"
                                >
                                    sign in with your credentials
                                </Link>
                            </p>
                        </div>
                    )}

                    {/* Step 2: Verify Code */}
                    {step === "verify" && (
                        <div className="space-y-4">
                            <Card className="border-border p-4 bg-blue-50 border-blue-200">
                                <div className="flex gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-600">
                                        We've sent a 6-digit code to your{" "}
                                        {recoveryMethod}
                                    </p>
                                </div>
                            </Card>

                            {error && (
                                <Card className="border-border p-4 bg-destructive/10 border-destructive/30">
                                    <div className="flex gap-2">
                                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-destructive">
                                            {error}
                                        </p>
                                    </div>
                                </Card>
                            )}

                            <div>
                                <label
                                    htmlFor="verification-code"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Verification Code
                                </label>
                                <Input
                                    id="verification-code"
                                    type="text"
                                    placeholder="000000"
                                    value={verificationCode}
                                    onChange={(e) =>
                                        setVerificationCode(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    maxLength={6}
                                    className="border-border text-center text-lg font-mono tracking-widest"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <Button
                                onClick={handleVerifyCode}
                                disabled={
                                    loading || verificationCode.length !== 6
                                }
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {loading ? "Verifying..." : "Verify"}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Didn't receive a code?{" "}
                                <button className="text-primary hover:text-primary/80 font-medium">
                                    Resend
                                </button>
                            </p>
                        </div>
                    )}

                    {/* Step 3: Reset Password */}
                    {step === "reset" && (
                        <div className="space-y-4">
                            <Card className="border-border p-4 bg-green-50 border-green-200">
                                <div className="flex gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-600">
                                        Verification successful! Set your new
                                        password.
                                    </p>
                                </div>
                            </Card>

                            {error && (
                                <Card className="border-border p-4 bg-destructive/10 border-destructive/30">
                                    <div className="flex gap-2">
                                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-destructive">
                                            {error}
                                        </p>
                                    </div>
                                </Card>
                            )}

                            <div>
                                <label
                                    htmlFor="new-password"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    New Password
                                </label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    className="border-border"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="confirm-new-password"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Confirm Password
                                </label>
                                <Input
                                    id="confirm-new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    className="border-border"
                                    disabled={loading}
                                />
                            </div>

                            <div className="text-xs text-muted-foreground">
                                <p className="mb-1 font-medium">
                                    Password requirements:
                                </p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    <li>At least 8 characters</li>
                                    <li>Mix of uppercase and lowercase</li>
                                    <li>At least one number</li>
                                    <li>At least one special character</li>
                                </ul>
                            </div>

                            <Button
                                onClick={handleResetPassword}
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === "success" && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="w-16 h-16 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground mb-2">
                                    Account Recovered
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Your password has been reset successfully.
                                    You can now sign in with your new password.
                                </p>
                            </div>
                            <Link href="/auth/signin">
                                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
