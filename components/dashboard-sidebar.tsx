"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BriefcaseBusiness,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Magnet,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";

type DashboardSidebarProps = {
  collapsed: boolean;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
  pathname: string;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, href: "/" },
  { label: "Leads", icon: Magnet, href: "/leads" },
  { label: "Knowledge Base", icon: BookOpen, href: "/knowledge-base" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Follow-ups", icon: BriefcaseBusiness, href: "/follow-ups" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function DashboardSidebar({
  collapsed,
  isLoggingOut,
  onLogout,
  pathname,
  onCloseMobile,
  onToggleCollapse,
}: DashboardSidebarProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)] text-slate-200 shadow-[0_20px_60px_rgba(2,6,23,0.28)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-24 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative flex h-[4.5rem] items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8_0%,#2563eb_100%)] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(14,165,233,0.28)]">
            IX
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                InziX
              </p>
              <p className="truncate text-xs text-sky-100/65">B2B SaaS Platform</p>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCloseMobile}
          className="h-9 w-9 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      <div className="relative px-4 pt-4">
        {!collapsed ? (
          <div className="rounded-[20px] border border-white/8 bg-white/5 px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-sky-200/60">
              Workspace
            </p>
            <p className="mt-1 text-[13px] leading-5 text-slate-300">
              Manage clients, chats, and follow-ups in one focused workspace.
            </p>
          </div>
        ) : null}
      </div>

      <nav className="relative flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onCloseMobile}
              className={
                "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200 " +
                (isActive
                  ? "bg-white/12 text-white shadow-[0_10px_26px_rgba(14,165,233,0.10)]"
                  : "text-slate-400 hover:bg-white/6 hover:text-white")
              }
            >
              {isActive ? (
                <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.14),transparent_75%)]" />
              ) : null}
              {isActive ? (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-sky-400" />
              ) : null}
              <span
                className={
                  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition " +
                  (isActive
                    ? "border-sky-300/20 bg-sky-400/12 text-sky-100"
                    : "border-transparent bg-white/0 text-slate-400 group-hover:border-white/8 group-hover:bg-white/6 group-hover:text-white")
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
              </span>
              {!collapsed ? (
                <div className="relative min-w-0">
                  <span className="block truncate font-medium">{item.label}</span>
                  <span className="block truncate text-[10px] text-slate-400/80">
                    {item.label === "Dashboard"
                      ? "Overview and insights"
                      : item.label === "Leads"
                        ? "Generate and review leads"
                      : item.label === "Knowledge Base"
                        ? "Docs and references"
                        : item.label === "Clients"
                          ? "Contacts and accounts"
                          : item.label === "Follow-ups"
                              ? "Tasks and reminders"
                              : "Workspace preferences"}
                  </span>
                </div>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/6 hover:text-white lg:flex"
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronsLeft className="h-5 w-5 shrink-0" />
          )}
          {!collapsed ? <span>Collapse sidebar</span> : null}
        </button>

        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => {
            void onLogout();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/6 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed ? <span>{isLoggingOut ? "Logging out..." : "Logout"}</span> : null}
        </button>
      </div>
    </div>
  );
}
