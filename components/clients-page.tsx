"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  BackendClient,
  Client,
  CreateClientPayload,
  ClientStageKey,
  clientStageOptions,
  getClientPayload,
  getScoreTone,
  getStatusClasses,
  qualifiedScoreToScore,
  scoreToQualifiedScore,
  mapBackendClient,
} from "@/components/client-data";
import {
  Building2,
  ChevronDown,
  Link2,
  Mail,
  PencilLine,
  Phone,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

type ClientFormState = Required<CreateClientPayload>;

type UserProfile = {
  id: string;
  name: string;
  headline: string;
  linkedin_url: string;
  avatar_url: string | null;
  notes: string;
  is_active: boolean;
};

const initialFormState: ClientFormState = {
  profile_id: "",
  name: "",
  company: "",
  email: "",
  phone: "",
  linkedin_url: "",
  notes: "",
  score: 0,
  calls_scheduled: false,
  qualified: false,
  pre_sale: false,
  not_a_fit: false,
};

function setSingleStage(
  current: ClientFormState,
  selectedStage: ClientStageKey,
  checked: boolean
): ClientFormState {
  return {
    ...current,
    calls_scheduled: selectedStage === "calls_scheduled" ? checked : false,
    qualified: selectedStage === "qualified" ? checked : false,
    pre_sale: selectedStage === "pre_sale" ? checked : false,
    not_a_fit: selectedStage === "not_a_fit" ? checked : false,
  };
}

function getErrorMessage(data: unknown, fallback: string) {
  return getBackendErrorMessage(data, fallback);
}

function mapUserProfile(value: unknown): UserProfile {
  const item =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "Unnamed Profile",
    headline: typeof item.headline === "string" ? item.headline : "",
    linkedin_url:
      typeof item.linkedin_url === "string" ? item.linkedin_url : "",
    avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
    notes: typeof item.notes === "string" ? item.notes : "",
    is_active: Boolean(item.is_active ?? true),
  };
}

function ClientCard({
  client,
  onEdit,
}: {
  client: Client;
  onEdit: (client: Client) => void;
}) {
  const router = useRouter();
  const initials = client.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const progressWidth = Math.max(10, Math.min(100, client.chatScore * 10));

  return (
    <div className="group flex h-full w-full flex-col rounded-[26px] border border-slate-200/90 bg-white/95 p-5 text-left shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_45px_rgba(14,165,233,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12 border border-slate-200">
            <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-slate-950">
              {client.name}
            </p>
            <p className="truncate text-sm text-slate-500">{client.company}</p>
          </div>
        </div>

        <span
          className={
            "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium " +
            getStatusClasses(client.status)
          }
        >
          {client.status}
        </span>
      </div>

      {client.profileId ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          Profile: {client.profileId}
        </div>
      ) : null}

      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-slate-400" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-slate-400" />
          <span>{client.phone}</span>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span>Last contacted {client.lastContacted}</span>
        </div>
        {client.linkedinUrl ? (
          <div className="flex items-center gap-3">
            <Link2 className="h-4 w-4 text-slate-400" />
            <span className="truncate">{client.linkedinUrl}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
              <span className={"h-2.5 w-2.5 rounded-full " + getScoreTone(client.chatScore)} />
              <span className="font-medium text-slate-700">
                Qualified Score: {client.chatScore.toFixed(1)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={"h-full rounded-full transition-all " + getScoreTone(client.chatScore)}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(client)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition group-hover:border-sky-200 group-hover:text-sky-700 hover:border-sky-200 hover:text-sky-700"
              aria-label={`Edit ${client.name}`}
            >
              <PencilLine className="h-3.5 w-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => router.push(`/clients/${client.id}`)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition group-hover:border-sky-200 group-hover:text-sky-700 hover:border-sky-200 hover:text-sky-700"
            >
              <span>View</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientList, setClientList] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [form, setForm] = useState<ClientFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`${backendUrl}/api/v1/clients`, {
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Unable to load clients."));
        }

        if (!ignore) {
          setClientList((data as BackendClient[]).map(mapBackendClient));
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load clients.";
          setLoadError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  useEffect(() => {
    let ignore = false;

    async function loadProfiles() {
      try {
        const response = await fetch(`${backendUrl}/api/v1/profiles`, {
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        });
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Unable to load profiles."));
        }

        if (!ignore) {
          const rows = Array.isArray(data) ? data : [];
          setProfiles(rows.map(mapUserProfile).filter((profile) => profile.id));
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load profiles.";
          showToast(message, "error");
        }
      }
    }

    loadProfiles();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const filteredClients = useMemo(() => {
    const searchTerm = search.toLowerCase();

    return clientList
      .filter((client) => {
        const haystack =
          `${client.name} ${client.company} ${client.email}`.toLowerCase();
        return haystack.includes(searchTerm);
      })
      .filter((client) => {
        if (sortBy === "Needs follow-up") {
          return client.status === "Needs Follow-up";
        }

        return true;
      });
  }, [clientList, search, sortBy]);

  function openAddDialog() {
    setEditingClient(null);
    setForm({
      ...initialFormState,
      profile_id: profiles[0]?.id ?? "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setEditingClient(client);
    setForm({
      ...initialFormState,
      ...getClientPayload(client),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingClient(null);
    setForm(initialFormState);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClient && !form.profile_id) {
      showToast("Select a source profile before adding a client.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const isEditing = Boolean(editingClient);
      const url = isEditing
        ? `${backendUrl}/api/v1/clients/${editingClient?.id}`
        : `${backendUrl}/api/v1/clients`;
      const payload: CreateClientPayload = {
        ...form,
        score: qualifiedScoreToScore(scoreToQualifiedScore(form.score)),
      };
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            isEditing ? "Unable to update client." : "Unable to add client."
          )
        );
      }

      const savedClient = mapBackendClient(data as BackendClient);

      setClientList((current) =>
        isEditing
          ? current.map((client) =>
              client.id === savedClient.id ? savedClient : client
            )
          : [savedClient, ...current]
      );
      closeDialog();
      showToast(
        isEditing
          ? "Client updated successfully."
          : "Client added successfully."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingClient
            ? "Unable to update client."
            : "Unable to add client.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Clients
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {filteredClients.length} clients
          </p>
        </div>

        <Button
          type="button"
          onClick={openAddDialog}
          className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(14,165,233,0.24)] hover:bg-sky-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients..."
            className="h-11 rounded-xl border-slate-200 bg-white pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 shadow-none outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-500/30 sm:w-52"
          >
            <option>All</option>
            <option>Recently added</option>
            <option>Needs follow-up</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-slate-200 bg-white/70 px-6 text-center text-sm font-medium text-slate-500">
          Loading clients...
        </div>
      ) : filteredClients.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={openEditDialog}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
            No clients yet
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {loadError ||
              "Start building your client workspace by adding your first customer profile."}
          </p>
          <Button
            type="button"
            onClick={openAddDialog}
            className="mt-6 h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      )}

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {editingClient ? "Edit Client" : "Add Client"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingClient
                  ? "Update this client's profile details."
                  : "Create a new client profile for your workspace."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Source Profile
                </label>
                <div className="relative">
                  <select
                    value={form.profile_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        profile_id: event.target.value,
                      }))
                    }
                    required={!editingClient}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 shadow-none outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Select profile</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {!profiles.length ? (
                  <p className="text-xs text-amber-600">
                    Create a profile first before adding new prospects.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Client Name
                  </label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    placeholder="Olivia Carter"
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Company
                  </label>
                  <Input
                    value={form.company}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        company: event.target.value,
                      }))
                    }
                    required
                    placeholder="Acme Ventures"
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Email
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      Optional
                    </span>
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@company.com"
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Phone
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      Optional
                    </span>
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+1 (555) 000-0000"
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  LinkedIn URL
                </label>
                <Input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      linkedin_url: event.target.value,
                    }))
                  }
                  placeholder="https://linkedin.com/in/client-name"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Qualified Score
                </label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={scoreToQualifiedScore(form.score)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      score: qualifiedScoreToScore(
                        event.target.valueAsNumber
                      ),
                    }))
                  }
                  placeholder="7.5"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-3 rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Client Stage
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {clientStageOptions.map((stage) => (
                    <label
                      key={stage.key}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form[stage.key])}
                        onChange={(event) =>
                          setForm((current) =>
                            setSingleStage(
                              current,
                              stage.key,
                              event.target.checked
                            )
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 accent-sky-600"
                      />
                      <span>{stage.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <Textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Add a few notes about this client..."
                  className="min-h-28 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  className="h-11 rounded-xl border-slate-200 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  {isSubmitting
                    ? editingClient
                      ? "Saving..."
                      : "Adding..."
                    : editingClient
                      ? "Save Changes"
                      : "Add Client"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
