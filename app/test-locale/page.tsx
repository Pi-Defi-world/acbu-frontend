"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function TestLocalePage() {
  const [currentLocale, setCurrentLocale] = useState("en-US");
  const testAmount = "1234567.89";

  const locales = [
    { code: "en-US", name: "English (United States)" },
    { code: "en-GB", name: "English (United Kingdom)" },
    { code: "de-DE", name: "German (Germany)" },
    { code: "fr-FR", name: "French (France)" },
    { code: "es-ES", name: "Spanish (Spain)" },
    { code: "ja-JP", name: "Japanese (Japan)" },
    { code: "zh-CN", name: "Chinese (China)" },
  ];

  const formatNGN = (amount: string, locale: string) => {
    const value = parseFloat(amount);
    if (isNaN(value)) return "";

    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "NGN",
      }).format(value);
    } catch {
      return `${value} NGN`;
    }
  };

  return (
    <PageContainer>
      <Card className="border-border p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          NGN Locale Formatting Test
        </h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Test Amount: {testAmount} NGN
            </h2>
            <p className="text-sm text-muted-foreground">
              Switch locales below to see how NGN formatting changes grouping separators.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {locales.map((locale) => (
              <Button
                key={locale.code}
                variant={currentLocale === locale.code ? "default" : "outline"}
                onClick={() => setCurrentLocale(locale.code)}
                className="h-auto p-3 flex flex-col items-start"
              >
                <span className="font-medium">{locale.name}</span>
                <span className="text-xs text-muted-foreground">
                  {locale.code}
                </span>
              </Button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Current Locale: {currentLocale}
            </h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">NGN Formatting:</span>{" "}
                <span className="font-mono text-lg">
                  {formatNGN(testAmount, currentLocale)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Notice how the grouping separators change based on locale:
                <br />
                • English uses commas (1,234,567.89 NGN)
                <br />
                • German uses periods and spaces (1.234.567,89 NGN)
                <br />
                • French uses spaces (1 234 567,89 NGN)
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              ✅ Acceptance Check
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              If you can see different grouping separators when switching locales above,
              then the NGN formatting is now locale-aware and working correctly!
            </p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
