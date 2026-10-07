"use client";

import { useState } from "react";
import type { AuthUser } from "@/components/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, ChevronDown, Menu } from "lucide-react";

type DashboardHeaderProps = {
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
  pageTitle: string;
  onOpenMobileSidebar: () => void;
  user: AuthUser | null;
};

function getInitials(name: string, email: string) {
  const source = name || email || "User";
  const initials = source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "U";
}

export function DashboardHeader({
  isLoggingOut,
  onLogout,
  pageTitle,
  onOpenMobileSidebar,
  user,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = user?.fullName || user?.email || "User";
  const roleLabel = user?.role === "manager" ? "Manager" : "User";

  return (
    <header className="sticky top-0 z-20 px-3 pt-2.5 sm:px-4 sm:pt-3 lg:px-3">
      <div className="flex h-[4.5rem] items-center justify-between gap-4 rounded-[26px] border border-white/70 bg-white/84 px-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileSidebar}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              {pageTitle}
            </p>
            <p className="hidden text-sm text-slate-500 sm:block">
              Manage your workspace from one clean dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden w-64 xl:block">
            <Input
              placeholder="Search..."
              className="h-11 rounded-2xl border-slate-200 bg-slate-50/90 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          <div className="hidden h-8 w-px bg-slate-200 sm:block" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-[20px] border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
            >
              <Avatar className="h-10 w-10">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                  {getInitials(displayName, user?.email ?? "")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="max-w-36 truncate text-sm font-medium text-slate-900">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Settings
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={async () => {
                    setMenuOpen(false);
                    await onLogout();
                  }}
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
