"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Send, Coins, Briefcase, User, Wallet } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: <Home className="w-5 h-5" /> },
  { name: "Send", href: "/send", icon: <Send className="w-5 h-5" /> },
  { name: "Mint", href: "/mint", icon: <Coins className="w-5 h-5" /> },
  {
    name: "Business",
    href: "/business",
    icon: <Briefcase className="w-5 h-5" />,
  },
  { name: "Wallet", href: "/wallet", icon: <Wallet className="w-5 h-5" /> },
  { name: "Me", href: "/me", icon: <User className="w-5 h-5" /> },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-40"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-between items-center h-20 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const showLabels = true;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={showLabels ? undefined : item.name}
              className={`flex flex-col items-center justify-center flex-1 h-20 gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.icon}
              {showLabels ? (
                <span className="text-xs font-medium text-center">
                  {item.name}
                </span>
              ) : (
                <span className="sr-only">{item.name}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
