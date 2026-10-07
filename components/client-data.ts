export type ClientStatus = "Active" | "Needs Follow-up" | "New";
export type ClientStageKey =
  | "calls_scheduled"
  | "qualified"
  | "pre_sale"
  | "not_a_fit";

export const clientStageOptions: { key: ClientStageKey; label: string }[] = [
  { key: "calls_scheduled", label: "Calls Scheduled" },
  { key: "qualified", label: "Qualified" },
  { key: "pre_sale", label: "Pre Sale" },
  { key: "not_a_fit", label: "Not a Fit" },
];

export type BackendClient = {
  id: string;
  user_id: string;
  profile_id: string | null;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  score: number;
  calls_scheduled: boolean;
  qualified: boolean;
  pre_sale: boolean;
  not_a_fit: boolean;
  needs_follow_up: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  profileId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  notes: string;
  lastContacted: string;
  status: ClientStatus;
  chatScore: number;
  callsScheduled: boolean;
  qualified: boolean;
  preSale: boolean;
  notAFit: boolean;
};

export type CreateClientPayload = {
  profile_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
  score?: number;
  calls_scheduled?: boolean;
  qualified?: boolean;
  pre_sale?: boolean;
  not_a_fit?: boolean;
};

export const clients: Client[] = [
  {
    id: "1",
    profileId: "",
    name: "Ava Thompson",
    company: "Northstar Labs",
    email: "ava@northstarlabs.com",
    phone: "+1 (415) 555-0192",
    linkedinUrl: "https://linkedin.com/in/ava-thompson",
    notes: "",
    lastContacted: "2 days ago",
    status: "Active",
    chatScore: 8.9,
    callsScheduled: true,
    qualified: false,
    preSale: false,
    notAFit: false,
  },
  {
    id: "2",
    profileId: "",
    name: "Daniel Kim",
    company: "Helio Systems",
    email: "daniel@heliosystems.com",
    phone: "+1 (628) 555-0126",
    linkedinUrl: "https://linkedin.com/in/daniel-kim",
    notes: "",
    lastContacted: "Today",
    status: "New",
    chatScore: 7.8,
    callsScheduled: false,
    qualified: true,
    preSale: false,
    notAFit: false,
  },
  {
    id: "3",
    profileId: "",
    name: "Maya Patel",
    company: "Atlas Commerce",
    email: "maya@atlascommerce.com",
    phone: "+1 (310) 555-0184",
    linkedinUrl: "https://linkedin.com/in/maya-patel",
    notes: "",
    lastContacted: "5 days ago",
    status: "Needs Follow-up",
    chatScore: 6.4,
    callsScheduled: false,
    qualified: false,
    preSale: false,
    notAFit: true,
  },
  {
    id: "4",
    profileId: "",
    name: "Noah Bennett",
    company: "Summit Grid",
    email: "noah@summitgrid.com",
    phone: "+1 (206) 555-0139",
    notes: "",
    lastContacted: "Yesterday",
    status: "Active",
    chatScore: 9.2,
    callsScheduled: false,
    qualified: false,
    preSale: true,
    notAFit: false,
  },
  {
    id: "5",
    profileId: "",
    name: "Sophia Green",
    company: "Cobalt Metrics",
    email: "sophia@cobaltmetrics.com",
    phone: "+1 (917) 555-0118",
    notes: "",
    lastContacted: "3 days ago",
    status: "Needs Follow-up",
    chatScore: 7.1,
    callsScheduled: false,
    qualified: false,
    preSale: false,
    notAFit: false,
  },
  {
    id: "6",
    profileId: "",
    name: "Ethan Walker",
    company: "Vertex Cloud",
    email: "ethan@vertexcloud.com",
    phone: "+1 (512) 555-0107",
    notes: "",
    lastContacted: "1 week ago",
    status: "New",
    chatScore: 8.1,
    callsScheduled: false,
    qualified: true,
    preSale: false,
    notAFit: false,
  },
];

export function getStatusClasses(status: ClientStatus) {
  if (status === "Active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Needs Follow-up") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function getScoreTone(score: number) {
  if (score >= 8.5) {
    return "bg-emerald-500";
  }

  if (score >= 7) {
    return "bg-sky-500";
  }

  return "bg-amber-500";
}

export function clampQualifiedScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToQualifiedScore(score: number) {
  return clampQualifiedScore(score) / 10;
}

export function qualifiedScoreToScore(qualifiedScore: number) {
  if (!Number.isFinite(qualifiedScore)) {
    return 0;
  }

  return clampQualifiedScore(qualifiedScore * 10);
}

function formatLastContacted(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const today = new Date();
  const differenceInDays = Math.floor(
    (today.getTime() - date.getTime()) / 86_400_000
  );

  if (differenceInDays <= 0) {
    return "Today";
  }

  if (differenceInDays === 1) {
    return "Yesterday";
  }

  if (differenceInDays < 7) {
    return `${differenceInDays} days ago`;
  }

  const differenceInWeeks = Math.floor(differenceInDays / 7);

  if (differenceInWeeks === 1) {
    return "1 week ago";
  }

  return `${differenceInWeeks} weeks ago`;
}

function normalizeStatus(client: BackendClient): ClientStatus {
  if (client.needs_follow_up) {
    return "Needs Follow-up";
  }

  if (client.is_active || client.status.toLowerCase() === "active") {
    return "Active";
  }

  return "New";
}

function normalizeText(value: string | null | undefined) {
  return value ?? "";
}

function normalizeBoolean(value: boolean | null | undefined) {
  return Boolean(value);
}

export function mapBackendClient(client: BackendClient): Client {
  return {
    id: client.id,
    profileId: normalizeText(client.profile_id),
    name: normalizeText(client.name),
    company: normalizeText(client.company),
    email: normalizeText(client.email),
    phone: normalizeText(client.phone),
    linkedinUrl: normalizeText(client.linkedin_url),
    notes: normalizeText(client.notes),
    lastContacted: formatLastContacted(client.updated_at || client.created_at),
    status: normalizeStatus(client),
    chatScore: scoreToQualifiedScore(client.score),
    callsScheduled: normalizeBoolean(client.calls_scheduled),
    qualified: normalizeBoolean(client.qualified),
    preSale: normalizeBoolean(client.pre_sale),
    notAFit: normalizeBoolean(client.not_a_fit),
  };
}

export function getClientPayload(client: Client): CreateClientPayload {
  return {
    profile_id: client.profileId,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    linkedin_url: client.linkedinUrl ?? "",
    notes: client.notes,
    score: qualifiedScoreToScore(client.chatScore),
    calls_scheduled: client.callsScheduled,
    qualified: client.qualified,
    pre_sale: client.preSale,
    not_a_fit: client.notAFit,
  };
}
