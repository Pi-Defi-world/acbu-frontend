'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowRight, Briefcase, Users, PiggyBank, CreditCard, Settings, Zap } from 'lucide-react';

const businessServices = [
  { id: 'sme', title: 'SME Services', description: 'Business accounts, transfers & statements', icon: Briefcase, badge: 'Pro', href: '/sme' },
  { id: 'salary', title: 'Payroll', description: 'Disburse salaries and manage batches', icon: Users, badge: 'New', href: '/salary' },
  { id: 'campaigns', title: 'Crowdfunding', description: 'Raise funds for projects via Trivela', icon: Zap, badge: 'Alpha', href: '/campaigns/1' },
  { id: 'enterprise', title: 'Enterprise', description: 'Bulk transfers and treasury management', icon: PiggyBank, href: '/enterprise' },
  { id: 'gateway', title: 'Payment Gateway', description: 'Create charges and manage escrow', icon: CreditCard, href: '/gateway' },
];

/**
 * Business overview and services page.
 */
export default function BusinessPage() {
  const router = useRouter();

  return (
    <>
      <div className="border-b border-border">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Business</h1>
          <p className="text-sm text-muted-foreground">Complete suite of tools for your business</p>
        </div>
      </div>

      <PageContainer>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">Monthly Volume</p>
            <p className="text-2xl font-bold text-foreground">ACBU 145,320</p>
          </Card>
          <Card className="border-border p-4">
            <p className="text-xs text-muted-foreground mb-2">Employees</p>
            <p className="text-2xl font-bold text-foreground">24</p>
          </Card>
        </div>

        <div className="space-y-3 mb-6">
          {businessServices.map((service) => {
            const Icon = service.icon;
            return (
              <button key={service.id} onClick={() => router.push(service.href)} className="w-full text-left">
                <Card className="border-border p-4 transition-all hover:border-primary hover:shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-secondary rounded-lg"><Icon className="w-5 h-5 text-primary" /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{service.title}</h3>
                          {service.badge && <Badge variant="secondary" className="text-xs">{service.badge}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Additional Tools</h3>
          <Button variant="outline" className="w-full justify-between border-border bg-transparent" onClick={() => router.push('/me/settings')}>
            <div className="flex items-center gap-2"><Settings className="w-4 h-4" /><span>Business Settings</span></div>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="w-full justify-between border-border bg-transparent" onClick={() => router.push('/me/settings')}>
            <div className="flex items-center gap-2"><Zap className="w-4 h-4" /><span>API Integration</span></div>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </PageContainer>
    </>
  );
}
