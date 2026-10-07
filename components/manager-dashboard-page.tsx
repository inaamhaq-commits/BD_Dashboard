"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { apiFetch } from "@/lib/api";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Search,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";

type ManagerLeadTotals = {
  total_leads: number;
  calls_scheduled: number;
  qualified: number;
  pre_sale: number;
  not_a_fit: number;
};

type ManagerUserSummary = {
  user_id: string;
  name: string;
  email: string;
  leads: ManagerLeadTotals;
};

type ManagerDashboardResponse = {
  totals: ManagerLeadTotals;
  users: ManagerUserSummary[];
};

const emptyTotals: ManagerLeadTotals = {
  total_leads: 0,
  calls_scheduled: 0,
  qualified: 0,
  pre_sale: 0,
  not_a_fit: 0,
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

function normalizeTotals(value: Partial<ManagerLeadTotals> | undefined) {
  return {
    total_leads: normalizeCount(value?.total_leads),
    calls_scheduled: normalizeCount(value?.calls_scheduled),
    qualified: normalizeCount(value?.qualified),
    pre_sale: normalizeCount(value?.pre_sale),
    not_a_fit: normalizeCount(value?.not_a_fit),
  };
}

export function ManagerDashboardPage() {
  const { showToast } = useToast();
  const [totals, setTotals] = useState<ManagerLeadTotals>(emptyTotals);
  const [users, setUsers] = useState<ManagerUserSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`${backendUrl}/api/v1/manager/dashboard`, {
          headers: {
            accept: "application/json",
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(getErrorMessage(data, "Unable to load manager dashboard."));
        }

        if (!ignore) {
          const overview = data as Partial<ManagerDashboardResponse>;
          setTotals(normalizeTotals(overview.totals));
          setUsers(
            (overview.users ?? []).map((user) => ({
              user_id: user.user_id,
              name: user.name,
              email: user.email,
              leads: normalizeTotals(user.leads),
            }))
          );
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load manager dashboard.";
          setLoadError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [showToast]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return users;

    return users.filter((user) =>
      `${user.name} ${user.email} ${user.user_id}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, users]);

  const cards = [
    {
      label: "Total Leads",
      value: totals.total_leads,
      tone: "bg-sky-50 text-sky-700",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Calls Scheduled",
      value: totals.calls_scheduled,
      tone: "bg-indigo-50 text-indigo-700",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Qualified",
      value: totals.qualified,
      tone: "bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      label: "Pre Sale",
      value: totals.pre_sale,
      tone: "bg-amber-50 text-amber-700",
      icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
      label: "Not a Fit",
      value: totals.not_a_fit,
      tone: "bg-rose-50 text-rose-700",
      icon: <TriangleAlert className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Team Overview
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              All user pipeline performance
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review total team leads first, then each user&apos;s lead breakdown.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by user or email..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
            />
          </div>
        </div>

        {isLoading || loadError ? (
          <div
            className={
              "mt-4 flex items-center rounded-2xl border px-4 py-3 text-sm " +
              (loadError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700")
            }
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loadError || "Loading manager dashboard..."}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
              {card.icon}
            </div>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            Users
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.3fr_repeat(5,minmax(4rem,0.5fr))] bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              <span>User</span>
              <span>Total</span>
              <span>Calls</span>
              <span>Qual.</span>
              <span>Pre</span>
              <span>Unfit</span>
            </div>
            {filteredUsers.map((summary) => (
              <div
                key={summary.user_id}
                className="grid grid-cols-[1.3fr_repeat(5,minmax(4rem,0.5fr))] border-t border-slate-200 px-4 py-3 text-sm text-slate-700"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-950">
                    {summary.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {summary.email}
                  </span>
                </span>
                <span>{summary.leads.total_leads}</span>
                <span>{summary.leads.calls_scheduled}</span>
                <span>{summary.leads.qualified}</span>
                <span>{summary.leads.pre_sale}</span>
                <span>{summary.leads.not_a_fit}</span>
              </div>
            ))}
            {!filteredUsers.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No user data found.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
            Team Mix
          </h2>
          <div className="mt-4 space-y-3">
            {[
              ["Calls Scheduled", totals.calls_scheduled, "bg-indigo-500"],
              ["Qualified", totals.qualified, "bg-emerald-500"],
              ["Pre Sale", totals.pre_sale, "bg-amber-500"],
              ["Not a Fit", totals.not_a_fit, "bg-rose-500"],
            ].map(([label, value, color]) => {
              const width = totals.total_leads
                ? Math.max(4, Math.round((Number(value) / totals.total_leads) * 100))
                : 0;

              return (
                <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="font-semibold text-slate-950">{value}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
