"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import { apiFetch } from "@/lib/api";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  BellRing,
  Building2,
  Trash2,
  Plus,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white/95 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
}: {
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        className={
          "relative h-7 w-12 shrink-0 rounded-full transition " +
          (enabled ? "bg-sky-600" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition " +
            (enabled ? "left-6" : "left-1")
          }
        />
      </button>
    </div>
  );
}

type ProfileFormState = {
  name: string;
  headline: string;
  linkedin_url: string;
  avatar_url: string;
  notes: string;
};

type UserProfile = {
  id: string;
  name: string;
  headline: string;
  linkedin_url: string;
  avatar_url: string | null;
  notes: string;
  is_active: boolean;
};

const initialProfileForm: ProfileFormState = {
  name: "",
  headline: "",
  linkedin_url: "",
  avatar_url: "",
  notes: "",
};

function readRows(data: unknown) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of ["profiles", "items", "data"]) {
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

function mapUserProfile(value: unknown): UserProfile {
  const item =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: readStringValue(item, ["id", "profile_id"]),
    name: readStringValue(item, ["name"], "Unnamed Profile"),
    headline: readStringValue(item, ["headline"]),
    linkedin_url: readStringValue(item, ["linkedin_url", "linkedinUrl"]),
    avatar_url:
      readStringValue(item, [
        "avatar_url",
        "avatarUrl",
        "profile_image",
        "profileImage",
        "image_url",
        "imageUrl",
        "photo_url",
        "photoUrl",
      ]) || null,
    notes: readStringValue(item, ["notes"]),
    is_active: Boolean(item.is_active ?? true),
  };
}

function getInitials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "P"
  );
}

function getErrorMessage(data: unknown, fallback: string) {
  return getBackendErrorMessage(data, fallback);
}

async function fetchProfiles() {
  const response = await apiFetch(`${backendUrl}/api/v1/profiles`, {
    headers: {
      accept: "application/json",
    },
  });
  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Unable to load profiles."));
  }

  return readRows(data).map(mapUserProfile).filter((profile) => profile.id);
}

export function SettingsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] =
    useState<ProfileFormState>(initialProfileForm);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState("");
  const displayName = user?.fullName || user?.email || "User";
  const displayRole = user?.role === "manager" ? "Manager" : "User";

  async function refreshProfiles(options: { showErrorToast?: boolean } = {}) {
    setIsLoadingProfiles(true);
    setProfilesError("");

    try {
      setProfiles(await fetchProfiles());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load profiles.";
      setProfilesError(message);

      if (options.showErrorToast) {
        showToast(message, "error");
      }
    } finally {
      setIsLoadingProfiles(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialProfiles() {
      try {
        const nextProfiles = await fetchProfiles();

        if (!ignore) {
          setProfiles(nextProfiles);
          setProfilesError("");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load profiles.";
          setProfilesError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoadingProfiles(false);
        }
      }
    }

    loadInitialProfiles();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  function closeProfileDialog() {
    setProfileDialogOpen(false);
    setProfileForm(initialProfileForm);
  }

  async function handleCreateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingProfile(true);

    try {
      const response = await apiFetch(`${backendUrl}/api/v1/profiles`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to create profile."));
      }

      showToast("Profile created successfully.", "success");
      closeProfileDialog();
      void refreshProfiles();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create profile.";
      showToast(message, "error");
    } finally {
      setIsCreatingProfile(false);
    }
  }

  async function handleDeleteProfile(profile: UserProfile) {
    if (deletingProfileId) return;

    const confirmed = window.confirm(
      `Delete ${profile.name}? This profile will be removed from your account.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingProfileId(profile.id);

    try {
      const response = await apiFetch(
        `${backendUrl}/api/v1/profiles/${profile.id}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
          },
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to delete profile."));
      }

      setProfiles((current) =>
        current.filter((currentProfile) => currentProfile.id !== profile.id)
      );
      showToast("Profile deleted successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete profile.";
      showToast(message, "error");
    } finally {
      setDeletingProfileId("");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your profile, workspace preferences, notifications, and security options.
          </p>
        </div>

        <Button
          type="button"
          className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white shadow-[0_12px_28px_rgba(14,165,233,0.24)] hover:bg-sky-700"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <SettingsSection
            icon={<UserRound className="h-5 w-5" />}
            title="Profile"
            description="Update the account information visible across your workspace."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 rounded-[24px] border border-sky-100 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Outreach profiles ({profiles.length})
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    All LinkedIn/source profiles connected to your account.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setProfileDialogOpen(true)}
                  className="h-10 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Profile
                </Button>
              </div>

              <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <Avatar className="h-16 w-16 border border-slate-200">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-slate-950 text-lg font-semibold text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {displayName}
                  </p>
                  <p className="truncate text-sm text-slate-500">{displayRole}</p>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingProfiles ? (
                  <div className="rounded-[22px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                    Loading profiles...
                  </div>
                ) : null}

                {profilesError ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {profilesError}
                  </div>
                ) : null}

                {!isLoadingProfiles && !profilesError && profiles.length ? (
                  <div className="grid gap-3">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3"
                      >
                        <Avatar className="h-12 w-12 border border-slate-200">
                          {profile.avatar_url ? (
                            <AvatarImage src={profile.avatar_url} alt={profile.name} />
                          ) : null}
                          <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                            {getInitials(profile.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {profile.name}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {profile.headline || profile.linkedin_url || "No headline added"}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                          {profile.is_active ? "Active" : "Inactive"}
                        </span>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deletingProfileId === profile.id}
                          onClick={() => void handleDeleteProfile(profile)}
                          className="h-9 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          {deletingProfileId === profile.id
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!isLoadingProfiles && !profilesError && !profiles.length ? (
                  <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No profiles found. Add your first profile to start creating prospects.
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <Input
                    value={displayName}
                    readOnly
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Work Email
                  </label>
                  <Input
                    value={user?.email ?? ""}
                    readOnly
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            icon={<Building2 className="h-5 w-5" />}
            title="Workspace"
            description="Control the main workspace identity and default messaging preferences."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Workspace Name
                </label>
                <Input
                  defaultValue="InziX"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Brand Description
                </label>
                <Textarea
                  defaultValue="B2B SaaS workspace for managing clients, follow-ups, and AI-assisted communication."
                  className="min-h-28 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>
            </div>
          </SettingsSection>
        </div>

        <div className="space-y-5">
          <SettingsSection
            icon={<BellRing className="h-5 w-5" />}
            title="Notifications"
            description="Choose how the platform alerts you about client activity and follow-up tasks."
          >
            <div className="space-y-3">
              <ToggleRow
                title="Follow-up reminders"
                description="Receive reminders when clients reach follow-up priority."
                enabled={true}
              />
              <ToggleRow
                title="Client message alerts"
                description="Get notified when a new client message is added to the workspace."
                enabled={true}
              />
              <ToggleRow
                title="Weekly summary"
                description="Receive a short performance summary every week."
                enabled={false}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Security"
            description="Manage account protection and sign-in safety settings."
          >
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <LockKeyhole className="h-4 w-4 text-slate-500" />
                  Password
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Last updated 14 days ago
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Two-factor authentication
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add another layer of security for your account.
                    </p>
                  </div>

                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Recommended
                  </span>
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>

      {profileDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Add Profile
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a source profile for LinkedIn outreach and prospect creation.
              </p>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Profile Name
                  </label>
                  <Input
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                    placeholder="Main LinkedIn"
                    className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Headline
                  </label>
                  <Input
                    value={profileForm.headline}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        headline: event.target.value,
                      }))
                    }
                    placeholder="Founder | B2B Sales"
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
                  value={profileForm.linkedin_url}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      linkedin_url: event.target.value,
                    }))
                  }
                  placeholder="https://linkedin.com/in/example"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Avatar URL
                </label>
                <Input
                  type="url"
                  value={profileForm.avatar_url}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      avatar_url: event.target.value,
                    }))
                  }
                  placeholder="https://example.com/avatar.jpg"
                  className="h-11 rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <Textarea
                  value={profileForm.notes}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Primary outreach profile"
                  className="min-h-28 rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeProfileDialog}
                  disabled={isCreatingProfile}
                  className="h-11 rounded-xl border-slate-200 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingProfile}
                  className="h-11 rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                >
                  {isCreatingProfile ? "Creating..." : "Create Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
