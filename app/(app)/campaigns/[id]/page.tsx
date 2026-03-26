'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Heart, Share2, Users, Calendar, ShieldCheck, Zap } from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Mock campaign data
  const campaign = {
    id: id,
    title: "Clean Water for Rural Communities",
    organizer: "Acbu Foundation",
    category: "Community",
    image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?q=80&w=2069&auto=format&fit=crop", // Using a stable unsplash link as generate_image failed
    description: "Provide sustainable clean water access to over 500 families in rural sub-Saharan regions. This project involves drilling three solar-powered boreholes and installing easy-maintenance filtration systems. Your contribution directly funds materials, labor, and local training for system maintenance.",
    raised: 12500,
    goal: 25000,
    backers: 142,
    daysLeft: 12,
    verified: true,
  };

  const percentRaised = Math.min(100, (campaign.raised / campaign.goal) * 100);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full aspect-video bg-muted relative overflow-hidden">
        <img 
          src={campaign.image} 
          alt={campaign.title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
        />
        <div className="absolute top-4 left-4">
          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm border-none px-3 py-1 font-medium">
            {campaign.category}
          </Badge>
        </div>
      </div>

      <PageContainer className="pt-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{campaign.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-border">
                <AvatarFallback className="text-[10px] bg-secondary text-primary font-bold">AF</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-muted-foreground">by {campaign.organizer}</span>
            </div>
            {campaign.verified && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex items-center gap-1 py-0.5 px-2">
                <ShieldCheck className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Verified</span>
              </Badge>
            )}
          </div>
        </div>

        <Card className="p-5 border-border bg-card/50 backdrop-blur-sm mb-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Zap className="w-24 h-24 text-primary" />
          </div>
          
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-black text-primary italic">ACBU {campaign.raised.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground font-medium">raised of ACBU {campaign.goal.toLocaleString()} goal</span>
          </div>

          <div className="space-y-4">
            <Progress value={percentRaised} className="h-2.5 bg-secondary overflow-hidden" />
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground italic">{percentRaised.toFixed(0)}%</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Funded</span>
              </div>
              <div className="flex flex-col border-x border-border/50 px-4">
                <span className="text-lg font-bold text-foreground">{campaign.backers}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Backers</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-lg font-bold text-foreground">{campaign.daysLeft}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Days Left</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              Our Story
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {campaign.description}
            </p>
          </section>

          <section className="bg-secondary/30 rounded-2xl p-4 border border-border/50">
            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest text-center">Backer Benefits</h3>
            <div className="space-y-3">
              {[
                "Priority impact updates twice a month",
                "Digital certificate of contribution",
                "Voting rights on secondary project phases",
                "Invites to virtual project launch"
              ].map((benefit, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="fixed bottom-24 left-0 right-0 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Button className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] group overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Back this project <Zap className="w-5 h-5 fill-accent text-accent animate-pulse" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            </Button>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
