"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import * as authApi from "@/lib/api/auth";

export default function SignUpPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [passcode, setPasscode] = useState("");
    const [confirmPasscode, setConfirmPasscode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (passcode !== confirmPasscode) {
            setError("Passcodes do not match");
            return;
        }
        if (passcode.length < 4) {
            setError("Passcode must be at least 4 characters");
            return;
        }
        if (!username.trim()) {
            setError("Please enter a username");
            return;
        }
        setLoading(true);
        try {
            await authApi.signup(username.trim(), passcode);
            router.push("/auth/signin?created=1");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Create account failed",
            );
        } finally {
            setLoading(false);
        }
    };

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
                                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
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
                                onChange={(e) => setUsername(e.target.value)}
                                className="border-border"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="signup-passcode"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Passcode (min 4 characters)
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
