"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
    const [formData, setFormData] = useState({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+234 (0) 123 456 7890",
        dateOfBirth: "1990-01-15",
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        setLoading(true);
        console.log("[v0] Saving profile:", formData);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaved(true);
        setLoading(false);
        setTimeout(() => setSaved(false), 3000);
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
                        Profile
                    </h1>
                </div>

                {/* Form */}
                <div className="px-4 py-6 space-y-4">
                    {saved && (
                        <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700">
                            Profile updated successfully
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="first-name"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                First Name
                            </label>
                            <Input
                                id="first-name"
                                type="text"
                                value={formData.firstName}
                                onChange={(e) =>
                                    handleChange("firstName", e.target.value)
                                }
                                className="border-border"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="last-name"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Last Name
                            </label>
                            <Input
                                id="last-name"
                                type="text"
                                value={formData.lastName}
                                onChange={(e) =>
                                    handleChange("lastName", e.target.value)
                                }
                                className="border-border"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="user-email"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Email
                        </label>
                        <Input
                            id="user-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                handleChange("email", e.target.value)
                            }
                            className="border-border"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="user-phone"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Phone
                        </label>
                        <Input
                            id="user-phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                                handleChange("phone", e.target.value)
                            }
                            className="border-border"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="user-dob"
                            className="text-sm font-medium text-foreground mb-2 block"
                        >
                            Date of Birth
                        </label>
                        <Input
                            id="user-dob"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) =>
                                handleChange("dateOfBirth", e.target.value)
                            }
                            className="border-border"
                        />
                    </div>

                    <Card className="border-border bg-muted p-4 mt-6">
                        <p className="text-xs text-muted-foreground mb-2">
                            Account Status
                        </p>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    Email verified:
                                </span>
                                <span className="text-green-600 font-medium">
                                    Yes
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    Phone verified:
                                </span>
                                <span className="text-green-600 font-medium">
                                    Yes
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">
                                    KYC status:
                                </span>
                                <span className="text-green-600 font-medium">
                                    Verified
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
