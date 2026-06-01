"use client";

import React, { useRef, useState, useEffect, useTransition } from "react";
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
  const [bottomOffset, setBottomOffset] = useState(0);

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

  function handleNav(href: string) {
    if (isPending || navigatingTo.current !== null || pathname === href) return;
    navigatingTo.current = href;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-40 transition-[bottom] duration-150 ease-out md:h-auto"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <div className="flex justify-between items-center h-20 px-1">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          const showLabels = true;
          // Explicitly set tabIndex to match the visual left-to-right order.
          // Using positive tabindex values here ensures keyboard focus
          // follows the same sequence users see on screen.
          const tabIndex = idx + 1;
          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              aria-label={item.name}
              disabled={isPending}
              tabIndex={tabIndex}
              className={`flex flex-col items-center justify-center flex-1 h-20 gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="md:w-7 md:h-7 flex items-center justify-center">
                {item.icon}
              </span>
              {showLabels ? (
                <span className="text-xs font-medium text-center md:text-sm">
                  {item.name}
                </span>
              ) : (
                <span className="sr-only">{item.name}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
