"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { apiFetch } from "@/lib/api";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

type ManagerDashboardShellProps = {
  children: ReactNode;
};

type ManagerUser = {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  clients_count: number;
};

type ManagerProfile = {
  id: string;
  name: string;
  headline: string;
  clients_count: number;
};

type UserProfilesState = {
  profiles: ManagerProfile[];
  isLoading: boolean;
  error: string;
  hasLoaded: boolean;
};

function getErrorMessage(data: unknown, fallback: string) {
  return getBackendErrorMessage(data, fallback);
}

function normalizeCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function readRows(data: unknown) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of ["users", "items", "data"]) {
    if (key in data) {
      const value = data[key as keyof typeof data];

      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

function readStringValue(
  value: Record<string, unknown>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const item = value[key];

    if (typeof item === "string") {
      return item;
    }
  }

  return fallback;
}

function readNumberValue(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];

    if (typeof item === "number") {
      return item;
    }
  }

  return 0;
}

function getInitials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

export function ManagerDashboardShell({ children }: ManagerDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearUser, isReady, user } = useAuth();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [managerUsers, setManagerUsers] = useState<ManagerUser[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<
    Record<string, UserProfilesState>
  >({});
  const [hoveredUserId, setHoveredUserId] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const selectedSidebarUserId = searchParams.get("user") ?? "";
  const selectedSidebarProfileId = searchParams.get("profile") ?? "";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "user") {
      router.replace("/");
    }
  }, [isReady, router, user]);

  useEffect(() => {
    if (!isReady || user?.role !== "manager") return;

    let ignore = false;

    async function loadUsers() {
      setIsLoadingUsers(true);
      setUsersError("");

      try {
        const response = await apiFetch(`${backendUrl}/api/v1/manager/users`, {
          headers: {
            accept: "application/json",
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Unable to load users."));
        }

        if (!ignore) {
          const rows = readRows(data);
          setManagerUsers(
            rows.map((item) => {
              const managerUser =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};

              return {
                user_id: readStringValue(managerUser, ["user_id", "id"]),
                name: readStringValue(
                  managerUser,
                  ["name", "full_name"],
                  "Unnamed User"
                ),
                email: readStringValue(managerUser, ["email"]),
                avatar_url:
                  readStringValue(managerUser, [
                    "avatar_url",
                    "avatarUrl",
                    "profile_image",
                    "profileImage",
                    "image_url",
                    "imageUrl",
                    "photo_url",
                    "photoUrl",
                  ]) || null,
                clients_count: normalizeCount(
                  readNumberValue(managerUser, [
                    "clients_count",
                    "prospects_count",
                    "leads_count",
                    "total_leads",
                  ])
                ),
              };
            }).filter((managerUser) => managerUser.user_id)
          );
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load users.";
          setUsersError(message);
        }
      } finally {
        if (!ignore) {
          setIsLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [isReady, user?.role]);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const response = await apiFetch(`${backendUrl}/api/v1/auth/logout`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 401) {
        showToast(getBackendErrorMessage(data, "Unable to log out right now."), "error");
        return;
      }

      clearUser();
      showToast("Logged out successfully.", "success");
      router.replace("/login");
    } catch {
      showToast("Unable to connect to the server.", "error");
    } finally {
      setIsLoggingOut(false);
      setMobileOpen(false);
    }
  }

  async function loadProfilesForUser(userId: string) {
    const currentState = profilesByUserId[userId];
    if (currentState?.hasLoaded || currentState?.isLoading) return;

    setProfilesByUserId((current) => ({
      ...current,
      [userId]: {
        profiles: current[userId]?.profiles ?? [],
        isLoading: true,
        error: "",
        hasLoaded: false,
      },
    }));

    try {
      const response = await apiFetch(
        `${backendUrl}/api/v1/manager/users/${userId}/profiles`,
        {
          headers: {
            accept: "application/json",
          },
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to load profiles."));
      }

      const rows = readRows(data);
      setProfilesByUserId((current) => ({
        ...current,
        [userId]: {
          profiles: rows
            .map((item) => {
              const profile =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};

              return {
                id: readStringValue(profile, ["id", "profile_id"]),
                name: readStringValue(profile, ["name"], "Unnamed Profile"),
                headline: readStringValue(profile, ["headline"]),
                clients_count: normalizeCount(
                  readNumberValue(profile, ["clients_count", "prospects_count"])
                ),
              };
            })
            .filter((profile) => profile.id),
          isLoading: false,
          error: "",
          hasLoaded: true,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load profiles.";
      setProfilesByUserId((current) => ({
        ...current,
        [userId]: {
          profiles: current[userId]?.profiles ?? [],
          isLoading: false,
          error: message,
          hasLoaded: true,
        },
      }));
    }
  }

  if (!isReady || !user || user.role === "user") {
    return null;
  }

  const sidebar = (
    <div className="flex h-full flex-col overflow-visible rounded-[26px] border border-slate-800 bg-slate-950 text-slate-200 shadow-[0_24px_70px_rgba(2,6,23,0.30)]">
      <div className="flex h-[4.5rem] items-center justify-between border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-sm font-semibold text-white">
            IX
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Manager</p>
            <p className="truncate text-xs text-slate-400">Team pipeline</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-visible px-3 py-4">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            router.push("/manager/dashboard");
          }}
          className={
            "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition " +
            (pathname === "/manager/dashboard"
              ? "bg-white/12 text-white"
              : "text-slate-400 hover:bg-white/8 hover:text-white")
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </button>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              router.push("/manager/user");
            }}
            className={
              "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition " +
              (pathname === "/manager/user" || pathname.startsWith("/manager/user/")
                ? "bg-white/12 text-white"
                : "text-slate-400 hover:bg-white/8 hover:text-white")
            }
          >
            <Users className="h-5 w-5" />
            <span className="min-w-0 flex-1">Users</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <div className="space-y-1 pl-5">
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading users
              </div>
            ) : null}

            {usersError ? (
              <div className="rounded-xl px-3 py-2 text-xs text-rose-300">
                {usersError}
              </div>
            ) : null}

            {managerUsers.map((managerUser) => {
              const isSelected = selectedSidebarUserId === managerUser.user_id;
              const userProfilesState = profilesByUserId[managerUser.user_id];
              const isHoveringUser = hoveredUserId === managerUser.user_id;

              return (
                <div
                  key={managerUser.user_id}
                  onMouseEnter={() => {
                    setHoveredUserId(managerUser.user_id);
                    void loadProfilesForUser(managerUser.user_id);
                  }}
                  onMouseLeave={() => setHoveredUserId("")}
                  onFocus={() => {
                    setHoveredUserId(managerUser.user_id);
                    void loadProfilesForUser(managerUser.user_id);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setHoveredUserId("");
                    }
                  }}
                  className="group/user relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void loadProfilesForUser(managerUser.user_id);
                      router.push(
                        `/manager/user?user=${encodeURIComponent(managerUser.user_id)}`
                      );
                    }}
                    className={
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition " +
                      (isSelected
                        ? "bg-sky-500/16 text-white"
                        : "text-slate-400 hover:bg-white/8 hover:text-white")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/10">
                        {managerUser.avatar_url ? (
                          <AvatarImage
                            src={managerUser.avatar_url}
                            alt={managerUser.name}
                          />
                        ) : null}
                        <AvatarFallback className="bg-white/10 text-[10px] font-semibold text-slate-200">
                          {getInitials(managerUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate">{managerUser.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {managerUser.clients_count}
                    </span>
                  </button>

                  {isHoveringUser ? (
                    <div className="absolute left-[calc(100%+0.625rem)] top-0 z-50 w-72 rounded-2xl border border-slate-800 bg-slate-950/98 p-3 text-slate-200 shadow-[0_24px_70px_rgba(2,6,23,0.45)] backdrop-blur">
                      <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/10">
                            {managerUser.avatar_url ? (
                              <AvatarImage
                                src={managerUser.avatar_url}
                                alt={managerUser.name}
                              />
                            ) : null}
                            <AvatarFallback className="bg-white/10 text-xs font-semibold text-slate-200">
                              {getInitials(managerUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {managerUser.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {managerUser.email || "Managed profiles"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-200">
                          {userProfilesState?.profiles.length ?? 0}
                        </span>
                      </div>

                      {userProfilesState?.isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading profiles
                        </div>
                      ) : null}

                      {userProfilesState?.error ? (
                        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                          {userProfilesState.error}
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        {userProfilesState?.profiles.map((profile) => {
                          const isProfileSelected =
                            selectedSidebarUserId === managerUser.user_id &&
                            selectedSidebarProfileId === profile.id;

                          return (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => {
                                setMobileOpen(false);
                                setHoveredUserId("");
                                router.push(
                                  `/manager/user?user=${encodeURIComponent(
                                    managerUser.user_id
                                  )}&profile=${encodeURIComponent(profile.id)}`
                                );
                              }}
                              className={
                                "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition " +
                                (isProfileSelected
                                  ? "bg-sky-500/20 text-white ring-1 ring-sky-400/25"
                                  : "text-slate-400 hover:bg-white/8 hover:text-white")
                              }
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {profile.name}
                                </span>
                                {profile.headline ? (
                                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                                    {profile.headline}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-slate-300">
                                {profile.clients_count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {userProfilesState?.hasLoaded &&
                      !userProfilesState.profiles.length &&
                      !userProfilesState.error ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-slate-500">
                          No profiles
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-70"
        >
          <LogOut className="h-5 w-5" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
        />
      ) : null}

      <div className="flex min-h-screen">
        <aside
          className={
            "fixed inset-y-0 left-0 z-40 w-[17rem] p-3 transition-transform lg:static lg:translate-x-0 " +
            (mobileOpen ? "translate-x-0" : "-translate-x-full")
          }
        >
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 px-3 pt-3">
            <div className="flex h-[4.5rem] items-center justify-between gap-4 rounded-[24px] border border-white bg-white/90 px-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  className="h-10 w-10 rounded-xl border border-slate-200 bg-white lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold tracking-tight">
                    Manager Dashboard
                  </p>
                  <p className="hidden text-sm text-slate-500 sm:block">
                    Monitor users, leads, qualified accounts, and pre-sale flow.
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Manager access
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="min-h-[calc(100vh-6.75rem)] rounded-[28px] border border-white bg-white/86 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
