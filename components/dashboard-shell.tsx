"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useToast } from "@/components/toast-provider";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage } from "@/lib/error-message";

type DashboardShellProps = {
  children: ReactNode;
  pageTitle?: string;
};

function getPageTitle(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/leads")) return "Leads";
  if (pathname.startsWith("/clients/")) return "Client Details";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/knowledge-base")) return "Knowledge Base";
  if (pathname.startsWith("/follow-ups")) return "Follow-ups";
  if (pathname.startsWith("/settings")) return "Settings";

  return "Dashboard";
}

export function DashboardShell({
  children,
  pageTitle,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { clearUser, isReady, user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sidebarWidth = sidebarCollapsed ? "lg:w-[5.5rem]" : "lg:w-[16rem]";
  const resolvedPageTitle = pageTitle ?? getPageTitle(pathname);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "manager") {
      router.replace("/manager/dashboard");
    }
  }, [isReady, router, user]);

  if (!isReady || !user || user.role === "manager") {
    return null;
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 401) {
        showToast(getErrorMessage(data, "Unable to log out right now."), "error");
        return;
      }

      showToast("Logged out successfully.", "success");
      clearUser();
      router.replace("/login");
      router.refresh();
    } catch {
      showToast("Unable to connect to the server.", "error");
    } finally {
      setIsLoggingOut(false);
      setMobileSidebarOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.16),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-950">
      {mobileSidebarOpen ? (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <div className="flex min-h-screen">
        <aside
          className={
            "fixed inset-y-0 left-0 z-40 h-screen w-[17rem] p-2.5 transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:w-auto lg:shrink-0 lg:translate-x-0 lg:p-3 " +
            sidebarWidth +
            " " +
            (mobileSidebarOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          <DashboardSidebar
            pathname={pathname}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardHeader
            pageTitle={resolvedPageTitle}
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            user={user}
          />

          <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3 lg:px-3 lg:pb-3">
            <div className="min-h-[calc(100vh-7.75rem)] rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur sm:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
