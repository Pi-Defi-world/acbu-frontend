'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { useMemo, useState } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FAQItem = {
  question: string;
  answer: string;
};

const faqs: FAQItem[] = [
  {
    question: "How can I reset my password?",
    answer:
      "To reset your password, go to Account > Security and choose 'Change password'. If you cannot log in, use the 'Forgot password' link on the sign-in screen.",
  },
  {
    question: "Where do I find my transaction history?",
    answer:
      "Transaction history is available in the Activity tab. You can filter by date, type, or amount to quickly find any transfer.",
  },
  {
    question: "How do I enable 2FA?",
    answer:
      "In the Me section, open Security settings and toggle two-factor authentication (2FA). Follow the prompts to connect your authenticator app.",
  },
  {
    question: "Can I change my registered email?",
    answer:
      "Yes. Visit Profile > Email and enter a new address. A confirmation email will be sent to complete verification.",
  },
  {
    question: "What should I do if I suspect unauthorized activity?",
    answer:
      "Immediately lock your account from Security settings and contact support at support@acbu.io. Our team is available 24/7 to assist.",
  },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const supportEmail = "support@acbu.io";

  const openFAQ = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
    } catch {
      // handle failure
      console.error("Failed to copy email to clipboard");
    }
  };

  const faqItems = useMemo(
    () =>
      faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <article key={faq.question} className="rounded-2xl border border-muted/20 bg-background/40">
            <button
              type="button"
              onClick={() => openFAQ(index)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
              className="w-full flex items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <span className="text-base font-semibold">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div id={`faq-answer-${index}`} className="px-5 pb-4 text-sm text-muted-foreground">
                {faq.answer}
              </div>
            )}
          </article>
        );
      }),
    [openIndex]
  );

  return (
    <PageContainer className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Help & Support</h1>
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground sm:text-base">
          Find answers to common questions or reach out to our support team.
        </p>
      </section>

      <section className="mb-6">
        <Card className="rounded-2xl border border-muted/20 shadow-sm">
          <CardHeader>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>Tap any question to expand the answer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">{faqItems}</CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-2xl border border-muted/20 bg-muted/5 shadow-sm">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Still need help?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2"
              >
                <a href={`mailto:${supportEmail}`} aria-label="Email support">
                  <Mail className="h-4 w-4" />
                  Email Support
                </a>
              </Button>

              <Button
                type="button"
                onClick={copyEmailToClipboard}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2"
              >
                Copy email address
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You can also send a direct message via the app if you prefer.
            </p>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
