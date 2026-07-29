"use client";

import React, { useRef, useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Send, Coins, Briefcase, User, Wallet } from "lucide-react";
import { useNavigationGuard } from "@/contexts/navigation-guard-context";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: <Home className="h-5 w-5" /> },
  { name: "Send", href: "/send", icon: <Send className="h-5 w-5" /> },
  { name: "Mint", href: "/mint", icon: <Coins className="h-5 w-5" /> },
  {
    name: "Business",
    href: "/business",
    icon: <Briefcase className="h-5 w-5" />,
  },
  { name: "Wallet", href: "/wallet", icon: <Wallet className="h-5 w-5" /> },
  { name: "Me", href: "/me", icon: <User className="h-5 w-5" /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigatingTo = useRef<string | null>(null);
  const [bottomOffset, setBottomOffset] = useState(0);
  const { confirmNavigation } = useNavigationGuard();

  useEffect(() => {
    navigatingTo.current = null;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = window.innerHeight - (vv.height + vv.offsetTop);
      setBottomOffset(Math.max(0, offset));
    };

    const vv = window.visualViewport;
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    handleViewportChange();

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  async function handleNav(href: string) {
    if (isPending || navigatingTo.current !== null || pathname === href) return;
    const confirmed = await confirmNavigation();
    if (!confirmed) return;
    navigatingTo.current = href;
    startTransition(() => {
      router.push(href);
      navigatingTo.current = null;
    });
  }

  return (
    <nav
      className="border-border bg-card fixed right-0 bottom-0 left-0 z-40 border-t transition-[bottom] duration-150 ease-out md:h-auto"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div className="flex h-20 items-center justify-between px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              data-testid={`nav-${item.name.toLowerCase()}`}
              onClick={() => handleNav(item.href)}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
              disabled={isPending}
              className={`flex h-20 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="text-center text-xs font-medium">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
