"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import * as authApi from "@/lib/api/auth";

const MIN_PASSCODE_LENGTH = 12;
const PASSCODE_POLICY_MESSAGE =
    "Passcode must be at least 12 characters and include uppercase, lowercase, number, and special character.";
const STRONG_PASSCODE_MIN_SCORE = 4;
const PASSCODE_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

const PASSCODE_WEAK_PATTERNS = [
    "password",
    "passcode",
    "qwerty",
    "letmein",
    "123456",
    "abcdef",
];

const getPasscodeStrength = (value: string) => {
    let score = 0;

    if (value.length >= MIN_PASSCODE_LENGTH) score += 1;
    if (value.length >= 16) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z\d]/.test(value)) score += 1;

    if (/(.)\1{2,}/.test(value)) score -= 1;
    if (/(0123|1234|2345|3456|4567|5678|6789)/.test(value)) score -= 1;
    if (/(abcd|bcde|cdef|defg|efgh|fghi|ghij)/i.test(value)) score -= 1;

    const lowered = value.toLowerCase();
    if (PASSCODE_WEAK_PATTERNS.some((pattern) => lowered.includes(pattern))) {
        score -= 2;
    }

    const normalizedScore = Math.max(0, Math.min(5, score));
    const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
    const barColors = [
        "bg-destructive/80",
        "bg-orange-500/80",
        "bg-amber-500/80",
        "bg-lime-500/80",
        "bg-emerald-500/80",
        "bg-emerald-500",
    ];

    return {
        score: normalizedScore,
        label: labels[normalizedScore],
        barColor: barColors[normalizedScore],
    };
};

export default function SignUpPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [passcode, setPasscode] = useState("");
    const [confirmPasscode, setConfirmPasscode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value.toLowerCase().trim())
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (passcode !== confirmPasscode) {
            setError("Passcodes do not match");
            return;
        }
        if (passcode.length < MIN_PASSCODE_LENGTH) {
            setError(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters`);
            return;
        }

        if (!PASSCODE_REGEX.test(passcode)) {
            setError(PASSCODE_POLICY_MESSAGE);
            return;
        }

        const { score } = getPasscodeStrength(passcode);
        if (score < STRONG_PASSCODE_MIN_SCORE) {
            setError("Passcode is too weak. Please choose a stronger passcode.");
            return;
        }
        if (!username) {
            setError("Please enter a username");
            return;
        }
        setLoading(true);
        try {
            await authApi.signup(username, passcode);
            router.push("/auth/signin?created=1");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Create account failed",
            );
        } finally {
            setLoading(false);
        }
    };

    const passcodeStrength = getPasscodeStrength(passcode);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border">
                <div className="p-6 md:p-8">
                    <Link
                        href="/auth/signin"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
                    >
                        ← Back to sign in
                    </Link>
                    <div className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                            Create account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Choose a username and passcode. No email required.
                        </p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                        {error && (
                            <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                <p className="text-sm text-destructive">
                                    {error}
                                </p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="signup-username"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Username
                            </label>
                            <Input
                                id="signup-username"
                                type="text"
                                autoComplete="username"
                                placeholder="Username"
                                value={username}
                                onChange={handleUsernameChange}
                                className="border-border"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="signup-passcode"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Passcode (min 12 characters)
                            </label>
                            <div className="relative">
                                <Input
                                    id="signup-passcode"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={passcode}
                                    onChange={(e) =>
                                        setPasscode(e.target.value)
                                    }
                                    className="border-border pr-10"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            {passcode.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-5 gap-1">
                                        {Array.from({ length: 5 }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full ${
                                                    idx < passcodeStrength.score
                                                        ? passcodeStrength.barColor
                                                        : "bg-muted"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Strength:{" "}
                                        <span className="font-medium text-foreground">
                                            {passcodeStrength.label}
                                        </span>
                                    </p>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {PASSCODE_POLICY_MESSAGE}
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="confirm-passcode"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Confirm passcode
                            </label>
                            <Input
                                id="confirm-passcode"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={confirmPasscode}
                                onChange={(e) =>
                                    setConfirmPasscode(e.target.value)
                                }
                                className="border-border"
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create account"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                                href="/auth/signin"
                                className="text-primary font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
