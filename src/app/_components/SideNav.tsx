"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";

const NAV_KEY = "dxtr-nav-collapsed";

const NAV_LINKS = [
  {
    href: "/calculator",
    label: "Calculator",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="12" y2="14" />
      </svg>
    ),
    protected: false,
  },
  {
    href: "/teams",
    label: "Team Builder",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="16" y1="11" x2="22" y2="11" />
      </svg>
    ),
    protected: true,
  },
];

export function SideNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(NAV_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem(NAV_KEY, String(next));
      return next;
    });
  }

  const isCollapsed = !mounted || collapsed;

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-950 transition-all duration-200 ${
        isCollapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Logo / collapse toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/60 px-3">
        {!isCollapsed && (
          <span className="text-sm font-bold tracking-tight text-violet-400">dxtr</span>
        )}
        <button
          onClick={toggle}
          className="ml-auto rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
          aria-label={isCollapsed ? "Expand nav" : "Collapse nav"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_LINKS.map(link => {
          const isActive = pathname.startsWith(link.href);

          if (link.protected && !isSignedIn) {
            return (
              <span
                key={link.href}
                title="Sign in to access Team Builder"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2.5 py-2 text-zinc-700"
              >
                <span className="shrink-0">{link.icon}</span>
                {!isCollapsed && <span className="text-sm font-medium">{link.label}</span>}
              </span>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition ${
                isActive
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span className="shrink-0">{link.icon}</span>
              {!isCollapsed && <span className="text-sm font-medium">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Auth section */}
      <div className="shrink-0 border-t border-zinc-800/60 p-3">
        {isSignedIn ? (
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <UserButton />
            {!isCollapsed && (
              <SignOutButton>
                <button className="text-xs text-zinc-600 transition hover:text-zinc-400">
                  Sign out
                </button>
              </SignOutButton>
            )}
          </div>
        ) : (
          <SignInButton mode="modal">
            <button
              className={`flex w-full items-center gap-2 rounded-lg bg-violet-500/10 px-2.5 py-2 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/20 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {!isCollapsed && <span>Sign in</span>}
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
