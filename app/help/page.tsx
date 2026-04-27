"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "How do I create an ACBU wallet?",
    answer:
      "Sign up for an account, and a wallet will be automatically created for you during the registration process. You'll receive a secure passphrase - make sure to save it in a safe place.",
  },
  {
    question: "How do I mint ACBU tokens?",
    answer:
      "Go to the Mint page, connect your wallet, enter the amount of USDC you want to convert, and confirm the transaction. Your ACBU tokens will be minted based on the current exchange rate.",
  },
  {
    question: "What are the transaction fees?",
    answer:
      "Transaction fees vary depending on the operation. Minting and burning typically have a small percentage fee, while transfers may have network fees. Check the transaction preview before confirming.",
  },
  {
    question: "How long do transactions take?",
    answer:
      "Most transactions are processed within 5-30 seconds on the Stellar network. Larger transactions or those during high network activity may take slightly longer.",
  },
  {
    question: "How do I recover my account?",
    answer:
      "If you've set up guardians, they can help you recover your account. Alternatively, use your recovery code that was provided during account creation. Go to the Recovery page for more options.",
  },
  {
    question: "What is 2FA and should I enable it?",
    answer:
      "Two-Factor Authentication (2FA) adds an extra layer of security to your account. We highly recommend enabling it in Settings > Security to protect your account from unauthorized access.",
  },
  {
    question: "How do I send ACBU to another user?",
    answer:
      "Go to the Send page, enter the recipient's address or username, specify the amount, and confirm. You can also add a note to your transaction.",
  },
  {
    question: "Can I burn ACBU back to fiat currency?",
    answer:
      "Yes! Go to the Burn page, select your desired currency (NGN, KES, etc.), enter the amount, provide your bank details, and confirm. The fiat will be sent to your account.",
  },
  {
    question: "What is the ACBU reserve system?",
    answer:
      "ACBU is backed by a diversified reserve of currencies. You can view the current reserve composition, ratios, and health status on the Reserves page.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the contact form below to submit a support ticket. For urgent issues, check our status page for any ongoing incidents. We typically respond within 24 hours.",
  },
];

export default function HelpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
    setFormData({ name: "", email: "", subject: "", message: "" });

    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Help Center
          </h1>
          <p className="text-muted-foreground">
            Find answers to common questions or contact our support team
          </p>
        </div>

        {/* Status Banner */}
        <Card className="mb-8 p-4 border-green-500/30 bg-green-500/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-600">
                All systems operational
              </p>
              <a
                href="https://status.acbu.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600/80 hover:text-green-600 inline-flex items-center gap-1"
              >
                View status page
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-8 p-6">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 hover:border-primary/50 transition-colors">
            <a
              href="https://docs.acbu.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Documentation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Technical guides
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-colors">
            <a
              href="https://status.acbu.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  System Status
                </h3>
                <p className="text-sm text-muted-foreground">
                  Service uptime
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-colors">
            <a
              href="https://community.acbu.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-foreground mb-1">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Join discussions
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              Contact Support
            </h2>
          </div>

          {submitted && (
            <div className="mb-6 p-4 rounded-lg border border-green-500/30 bg-green-500/10 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-600">
                  Message sent successfully!
                </p>
                <p className="text-sm text-green-600/80">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Subject
              </label>
              <Input
                type="text"
                placeholder="What do you need help with?"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Message
              </label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                disabled={loading}
                rows={6}
                className="resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              For urgent security issues, please email{" "}
              <a
                href="mailto:security@acbu.io"
                className="text-primary hover:underline"
              >
                security@acbu.io
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
