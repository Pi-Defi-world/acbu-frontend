"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { useRouter } from "next/navigation";

interface SMEProduct {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

const smeProducts: SMEProduct[] = [
  {
    id: "business-account",
    name: "Business Account",
    description: "Dedicated account for your enterprise with multi-user access",
    icon: <Briefcase className="w-6 h-6" />,
    features: [
      "Multi-user management",
      "Business analytics",
      "Invoice tracking",
      "Team collaboration tools",
    ],
    color: "from-blue-500/10 to-blue-600/10",
  },
  {
    id: "payroll",
    name: "Payroll Services",
    description: "Automated payroll processing and employee payments",
    icon: <Users className="w-6 h-6" />,
    features: [
      "Batch payments",
      "Tax compliance",
      "Payment history",
      "Automated scheduling",
    ],
    color: "from-purple-500/10 to-purple-600/10",
  },
  {
    id: "api-integration",
    name: "API Integration",
    description:
      "Connect your systems directly to ACBU for seamless transactions",
    icon: <TrendingUp className="w-6 h-6" />,
    features: [
      "RESTful API",
      "Webhook support",
      "Real-time tracking",
      "Developer documentation",
    ],
    color: "from-green-500/10 to-green-600/10",
  },
];

const productRoutes: Record<string, string> = {
  "business-account": "/business",
  payroll: "/business/salary",
  "api-integration": "/business/enterprise",
};

export default function SMEServices() {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<SMEProduct | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);

  const handleSelectProduct = (product: SMEProduct) => {
    setSelectedProduct(product);
    setShowDialog(true);
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 hover:bg-muted rounded transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">SME Services</h1>
            <p className="text-xs text-muted-foreground">For your business</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PageContainer>
        <div className="space-y-6">
          {/* Quick links */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="justify-start border-border"
              onClick={() => router.push("/sme/send")}
            >
              SME Send
            </Button>
            <Button
              variant="outline"
              className="justify-start border-border"
              onClick={() => router.push("/sme/transfers")}
            >
              Transfers
            </Button>
            <Button
              variant="outline"
              className="justify-start border-border"
              onClick={() => router.push("/sme/statements")}
            >
              Statements
            </Button>
          </div>

          {/* Overview Card */}
          <Card className="border-border bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-5">
            <h2 className="text-lg font-bold text-foreground mb-2">
              Scale Your Business
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enterprise-grade financial tools designed for growing businesses
              and teams.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle className="w-4 h-4" />
              <span>No setup fees • Quick approval</span>
            </div>
          </Card>

          {/* Products Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Available Services
            </h3>
            {smeProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="w-full text-left"
              >
                <Card
                  className={`border-border bg-gradient-to-br ${product.color} p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-primary">{product.icon}</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {product.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {product.features.slice(0, 2).map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {product.features.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{product.features.length - 2} more
                      </Badge>
                    )}
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Quick FAQ</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  How long does approval take?
                </p>
                <p className="text-xs text-muted-foreground">
                  Most businesses are approved within 24 hours with complete
                  documentation.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Are there setup fees?
                </p>
                <p className="text-xs text-muted-foreground">
                  No setup fees. You only pay transaction fees based on your
                  plan.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Can I integrate with my existing systems?
                </p>
                <p className="text-xs text-muted-foreground">
                  Yes, our API supports integration with most business systems.
                </p>
              </div>
            </div>
          </Card>

          {/* CTA Section */}
          <Card className="border-border bg-gradient-to-br from-primary/20 to-secondary/10 p-5">
            <h4 className="font-semibold text-foreground mb-2">
              Ready to scale?
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Get started with SME services and manage your business finances
              like never before.
            </p>
            <Button
              onClick={() => router.push("/business")}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </Card>
        </div>
      </PageContainer>

      {/* Product Details Dialog */}
      {selectedProduct && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md border-border">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
              <DialogDescription>
                {selectedProduct.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Features */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">
                  Key Features
                </h4>
                <div className="space-y-2">
                  {selectedProduct.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <Card className="border-border bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                <p className="text-lg font-bold text-foreground mb-1">
                  Custom per business
                </p>
                <p className="text-xs text-muted-foreground">
                  Depending on your transaction volume and requirements
                </p>
              </Card>

              {/* Benefits */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Benefits</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Increase operational efficiency</li>
                  <li>Reduce manual processing time</li>
                  <li>Improved cash flow management</li>
                  <li>Enhanced security and compliance</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 border-border"
                >
                  Learn More
                </Button>
                <Button
                  onClick={() => {
                    router.push(
                      productRoutes[selectedProduct.id] ?? "/business"
                    );
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
