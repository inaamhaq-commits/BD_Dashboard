"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  BackendClient,
  mapBackendClient,
  type Client,
} from "@/components/client-data";
import { useToast } from "@/components/toast-provider";
import { apiFetch } from "@/lib/api";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  Loader2,
  Mail,
  Phone,
  Search,
  Users,
} from "lucide-react";

type ManagerUser = {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  clients_count: number;
};

type ManagerClient = Client & {
  userId: string;
};

type ManagerProfile = {
  id: string;
  user_id: string;
  name: string;
  headline: string;
  linkedin_url: string;
  avatar_url: string | null;
  notes: string;
  is_active: boolean;
  clients_count: number;
};

type UserProfilesState = {
  profiles: ManagerProfile[];
  isLoading: boolean;
  error: string;
  hasLoaded: boolean;
};

type UserClientsState = {
  clients: ManagerClient[];
  isLoading: boolean;
  error: string;
  warning: string;
  hasLoaded: boolean;
};

type PriorityKey = "high" | "mid" | "low" | "uncategorized";

const emptyClients: ManagerClient[] = [];
const emptyProfiles: ManagerProfile[] = [];

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

  for (const key of ["clients", "prospects", "leads", "items", "data"]) {
    if (key in data) {
      const value = data[key as keyof typeof data];

      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

async function fetchRows(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await apiFetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(data, `Request failed with ${response.status}.`));
    }

    return readRows(data);
  } finally {
    window.clearTimeout(timeout);
  }
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

    if (typeof item === "string") {
      const numberValue = Number(item);

      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }

  return 0;
}

function normalizeBackendClientRow(row: unknown): BackendClient {
  const value =
    row && typeof row === "object" ? (row as Record<string, unknown>) : {};

  return {
    id: readStringValue(value, ["id", "client_id"]),
    user_id: readStringValue(value, ["user_id", "userId"]),
    profile_id: readStringValue(value, ["profile_id", "profileId"]) || null,
    name: readStringValue(value, ["name"], "Unnamed Prospect"),
    company: readStringValue(value, ["company"], ""),
    email: readStringValue(value, ["email"]) || null,
    phone: readStringValue(value, ["phone"]) || null,
    linkedin_url: readStringValue(value, ["linkedin_url", "linkedinUrl"]) || null,
    notes: readStringValue(value, ["notes"]) || null,
    score: readNumberValue(value, ["score", "qualified_score", "chatScore"]),
    calls_scheduled: Boolean(value.calls_scheduled ?? value.callsScheduled),
    qualified: Boolean(value.qualified),
    pre_sale: Boolean(value.pre_sale ?? value.preSale),
    not_a_fit: Boolean(value.not_a_fit ?? value.notAFit),
    needs_follow_up: Boolean(value.needs_follow_up ?? value.needsFollowUp),
    is_active: Boolean(value.is_active ?? value.isActive ?? true),
    status: readStringValue(value, ["status"], "new"),
    created_at: readStringValue(value, ["created_at", "createdAt"]),
    updated_at: readStringValue(value, ["updated_at", "updatedAt"]),
  };
}

function mapManagerProfile(row: unknown): ManagerProfile {
  const value =
    row && typeof row === "object" ? (row as Record<string, unknown>) : {};

  return {
    id: readStringValue(value, ["id", "profile_id"]),
    user_id: readStringValue(value, ["user_id", "userId"]),
    name: readStringValue(value, ["name"], "Unnamed Profile"),
    headline: readStringValue(value, ["headline"]),
    linkedin_url: readStringValue(value, ["linkedin_url", "linkedinUrl"]),
    avatar_url: readStringValue(value, ["avatar_url", "avatarUrl"]) || null,
    notes: readStringValue(value, ["notes"]),
    is_active: Boolean(value.is_active ?? true),
    clients_count: normalizeCount(
      readNumberValue(value, ["clients_count", "prospects_count", "total_leads"])
    ),
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapManagerClient(client: BackendClient): ManagerClient {
  return {
    ...mapBackendClient(client),
    userId: client.user_id ?? "",
  };
}

function mapManagerClientRows(rows: unknown[]) {
  return rows.map((item) => mapManagerClient(normalizeBackendClientRow(item)));
}

function getClientPriority(client: ManagerClient): PriorityKey {
  if (client.chatScore >= 8.5) {
    return "high";
  }

  if (client.chatScore >= 7) {
    return "mid";
  }

  return "low";
}

export function ManagerUsersPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClientId, setExpandedClientId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profilesState, setProfilesState] = useState<UserProfilesState>({
    profiles: [],
    isLoading: false,
    error: "",
    hasLoaded: false,
  });
  const [selectedClientsState, setSelectedClientsState] =
    useState<UserClientsState>({
      clients: [],
      isLoading: false,
      error: "",
      warning: "",
      hasLoaded: false,
    });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState("");
  const selectedUserId = searchParams.get("user") ?? "";
  const profileIdFromUrl = searchParams.get("profile") ?? "";

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setIsLoadingUsers(true);
      setLoadError("");

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
          const nextUsers = rows.map((item) => {
            const user =
              item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};

            return {
              user_id: readStringValue(user, ["user_id", "id"]),
              name: readStringValue(user, ["name", "full_name"], "Unnamed User"),
              email: readStringValue(user, ["email"]),
              avatar_url:
                readStringValue(user, [
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
                readNumberValue(user, [
                  "clients_count",
                  "prospects_count",
                  "leads_count",
                  "total_leads",
                ])
              ),
            };
          }).filter((user) => user.user_id);

          setUsers(nextUsers);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load users.";
          setLoadError(message);
          showToast(message, "error");
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
  }, [showToast]);

  const selectedClients = selectedUserId
    ? selectedClientsState.clients
    : emptyClients;
  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return selectedClients;

    return selectedClients.filter((client) =>
      `${client.name} ${client.company} ${client.email}`
        .toLowerCase()
        .includes(term)
    );
  }, [clientSearch, selectedClients]);

  const priorityGroups = useMemo(() => {
    const groups: Record<PriorityKey, ManagerClient[]> = {
      high: [],
      mid: [],
      low: [],
      uncategorized: [],
    };

    filteredClients.forEach((client) => {
      if (Number.isFinite(client.chatScore)) {
        groups[getClientPriority(client)].push(client);
      } else {
        groups.uncategorized.push(client);
      }
    });

    Object.values(groups).forEach((group) => {
      group.sort((first, second) => second.chatScore - first.chatScore);
    });

    return groups;
  }, [filteredClients]);

  const prioritySections = [
    {
      key: "high" as const,
      title: "1. High",
      description: "Score 8.5 and above.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
      clients: priorityGroups.high,
    },
    {
      key: "mid" as const,
      title: "2. Mid",
      description: "Score 7.0 to 8.4.",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      dot: "bg-sky-500",
      clients: priorityGroups.mid,
    },
    {
      key: "low" as const,
      title: "3. Low",
      description: "Score below 7.0.",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
      clients: priorityGroups.low,
    },
    {
      key: "uncategorized" as const,
      title: "Other",
      description: "Prospects without a valid score.",
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      dot: "bg-slate-400",
      clients: priorityGroups.uncategorized,
    },
  ];

  const selectedUser = users.find(
    (managerUser) => managerUser.user_id === selectedUserId
  );
  const selectedProfiles = selectedUserId
    ? profilesState.profiles
    : emptyProfiles;
  const activeProfileId = profileIdFromUrl || selectedProfileId;
  const selectedProfile = selectedProfiles.find(
    (profile) => profile.id === activeProfileId
  );

  useEffect(() => {
    let ignore = false;

    if (!selectedUserId) {
      return undefined;
    }

    async function loadProfiles() {
      setSelectedProfileId(profileIdFromUrl);
      setExpandedClientId("");
      setSelectedClientsState({
        clients: [],
        isLoading: false,
        error: "",
        warning: "",
        hasLoaded: false,
      });
      setProfilesState({
        profiles: [],
        isLoading: true,
        error: "",
        hasLoaded: false,
      });

      try {
        const rows = await fetchRows(
          `${backendUrl}/api/v1/manager/users/${selectedUserId}/profiles`
        );
        const profiles = rows
          .map(mapManagerProfile)
          .filter((profile) => profile.id);

        if (!ignore) {
          setProfilesState({
            profiles,
            isLoading: false,
            error: "",
            hasLoaded: true,
          });
          setSelectedProfileId(profileIdFromUrl);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load profiles.";
          setProfilesState({
            profiles: [],
            isLoading: false,
            error: message,
            hasLoaded: true,
          });
          showToast(message, "error");
        }
      }
    }

    loadProfiles();

    return () => {
      ignore = true;
    };
  }, [profileIdFromUrl, selectedUserId, showToast]);

  useEffect(() => {
    let ignore = false;
    const expectedClientCount =
      selectedProfiles.find((profile) => profile.id === activeProfileId)
        ?.clients_count ?? 0;

    if (!selectedUserId || !activeProfileId) {
      return undefined;
    }

    async function loadSelectedUserClients() {
      setSelectedClientsState({
        clients: [],
        isLoading: true,
        error: "",
        warning: "",
        hasLoaded: false,
      });

      try {
        const rows = await fetchRows(
          `${backendUrl}/api/v1/profiles/${activeProfileId}/clients`
        );

        if (!ignore) {
          const warning =
            expectedClientCount > 0 && !rows.length
              ? `Expected ${expectedClientCount} prospect${
                  expectedClientCount === 1 ? "" : "s"
                }, but the prospects APIs returned 0 rows for this user.`
              : "";

          setSelectedClientsState({
            clients: mapManagerClientRows(rows),
            isLoading: false,
            error: "",
            warning,
            hasLoaded: true,
          });
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load user clients.";
          setSelectedClientsState({
            clients: [],
            isLoading: false,
            error: message,
            warning: "",
            hasLoaded: true,
          });
          showToast(message, "error");
        }
      }
    }

    loadSelectedUserClients();

    return () => {
      ignore = true;
    };
  }, [
    activeProfileId,
    selectedProfiles,
    selectedUserId,
    showToast,
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Manager Users
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {selectedUser?.name ?? "Select a user"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedUser
                ? selectedUser.email
                : "Choose a user name from the sidebar to load their prospects."}
            </p>
          </div>

          {selectedUser ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sky-700">
              <p className="text-2xl font-semibold">{selectedUser.clients_count}</p>
              <p className="text-xs font-medium">Total prospects / clients</p>
            </div>
          ) : null}
        </div>

        {isLoadingUsers || loadError ? (
          <div
            className={
              "mt-4 flex items-center rounded-2xl border px-4 py-3 text-sm " +
              (loadError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700")
            }
          >
            {isLoadingUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loadError || "Loading users..."}
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        {selectedUser ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-12 w-12 border border-slate-200">
                  {selectedUser.avatar_url ? (
                    <AvatarImage
                      src={selectedUser.avatar_url}
                      alt={selectedUser.name}
                    />
                  ) : null}
                  <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                    {getInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                    {selectedUser.name}
                  </h2>
                  <p className="truncate text-sm text-slate-500">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Profiles and prospects
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select a profile first, then review prospects from that profile.
                </p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search prospects..."
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="font-medium text-slate-500">Profile: </span>
                {profilesState.isLoading ? (
                  <span className="text-slate-500">Loading profile...</span>
                ) : selectedProfile?.linkedin_url ? (
                  <a
                    href={selectedProfile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-700 hover:text-sky-800 hover:underline"
                  >
                    {selectedProfile.name}
                  </a>
                ) : selectedProfile ? (
                  <span className="font-semibold text-slate-950">
                    {selectedProfile.name}
                  </span>
                ) : activeProfileId ? (
                  <span className="text-slate-500">Selected profile</span>
                ) : (
                  <span className="text-slate-500">
                    Hover a user in the sidebar and choose a profile.
                  </span>
                )}
              </div>
              {selectedProfile ? (
                <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {selectedProfile.clients_count} prospects
                </span>
              ) : null}
            </div>

            {profilesState.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {profilesState.error}
              </div>
            ) : null}

            {selectedClientsState?.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {selectedClientsState.error}
              </div>
            ) : null}

            {selectedClientsState?.warning ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {selectedClientsState.warning}
              </div>
            ) : null}

            {!activeProfileId && profilesState.hasLoaded && selectedProfiles.length ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                <Users className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Select a profile
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Click a profile to load prospects for that profile.
                </p>
              </div>
            ) : null}

            {activeProfileId &&
            selectedClientsState?.hasLoaded &&
            !selectedClientsState.error &&
            !selectedClients.length ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                <Users className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No prospects returned for this user
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  The selected user exists, but the manager prospects endpoint returned an empty list.
                </p>
              </div>
            ) : null}

            {activeProfileId ? (
            <div className="mt-5 space-y-4">
              {prioritySections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={"h-2.5 w-2.5 rounded-full " + section.dot} />
                        <h3 className="truncate text-base font-semibold text-slate-950">
                          {section.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {section.description}
                      </p>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold " +
                        section.tone
                      }
                    >
                      {section.clients.length} prospects
                    </span>
                  </div>

                  <div
                    className="mt-4 grid gap-3"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
                    }}
                  >
                    {section.clients.map((client) => (
                      <div
                        key={client.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedClientId((current) =>
                            current === client.id ? "" : client.id
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedClientId((current) =>
                              current === client.id ? "" : client.id
                            );
                          }
                        }}
                        className="flex min-h-[12rem] cursor-pointer flex-col rounded-[18px] border border-slate-200 bg-white p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-[0_16px_34px_rgba(14,165,233,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold tracking-tight text-slate-950">
                              {client.name}
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-slate-500">
                              {client.company || "No company added"}
                            </p>
                          </div>
                          {client.linkedinUrl ? (
                            <a
                              href={client.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                            >
                              LinkedIn
                            </a>
                          ) : (
                            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400">
                              No LinkedIn
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{client.email || "No email"}</span>
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{client.phone || "No phone"}</span>
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {client.notAFit ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              Not Fit
                            </span>
                          ) : null}
                        </div>

                        {expandedClientId === client.id ? (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Notes
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {client.notes || "No notes added."}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                          <span className="text-xs font-medium text-slate-500">
                            Score
                          </span>
                          <span className="text-2xl font-semibold text-slate-950">
                            {client.chatScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {!section.clients.length && !selectedClientsState?.isLoading ? (
                      <div className="rounded-[18px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                        No prospects in this level.
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            ) : null}
          </>
        ) : (
          <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 px-6 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {isLoadingUsers ? "Loading users..." : "Select a user"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              User names are listed under Users in the sidebar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
