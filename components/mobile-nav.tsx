"use client";

import React, { useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigatingTo = useRef<string | null>(null);

  function handleNav(href: string) {
    if (isPending || navigatingTo.current === href || pathname === href) return;
    navigatingTo.current = href;
    startTransition(() => {
      router.push(href);
      navigatingTo.current = null;
    });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-40"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-between items-center h-20 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
              disabled={isPending}
              className={`flex flex-col items-center justify-center flex-1 h-20 gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium text-center">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
