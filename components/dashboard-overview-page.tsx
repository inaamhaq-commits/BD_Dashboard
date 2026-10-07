"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Loader2,
  TrendingUp,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";

function percentage(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function PerformanceStageCard({
  icon,
  label,
  value,
  ratio,
  description,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  ratio: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          {icon}
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
          {ratio}
        </span>
      </div>

      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

type PerformanceRange = "week" | "month" | "3month";

type PerformanceSnapshot = {
  label: string;
  leadsGenerated: number;
  callsScheduled: number;
  qualifiedCount: number;
  preSaleCount: number;
  notFitCount: number;
};

type BackendDashboardOverview = {
  label?: string;
  leads_generated?: number;
  calls_scheduled?: number;
  qualified?: number;
  pre_sale?: number;
  not_a_fit?: number;
};

const emptySnapshot: PerformanceSnapshot = {
  label: "This Month",
  leadsGenerated: 0,
  callsScheduled: 0,
  qualifiedCount: 0,
  preSaleCount: 0,
  notFitCount: 0,
};

function getErrorMessage(data: unknown, fallback: string) {
  return getBackendErrorMessage(data, fallback);
}

async function readJsonResponse(response: Response, fallback: string) {
  const text = await response.text();
  let data: unknown = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallback));
  }

  return data;
}

function normalizeCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function mapDashboardOverview(data: BackendDashboardOverview): PerformanceSnapshot {
  return {
    label: data.label || "Dashboard Overview",
    leadsGenerated: normalizeCount(data.leads_generated),
    callsScheduled: normalizeCount(data.calls_scheduled),
    qualifiedCount: normalizeCount(data.qualified),
    preSaleCount: normalizeCount(data.pre_sale),
    notFitCount: normalizeCount(data.not_a_fit),
  };
}

export function DashboardOverviewPage() {
  const { showToast } = useToast();
  const [selectedRange, setSelectedRange] = useState<PerformanceRange>("month");
  const [performanceSnapshot, setPerformanceSnapshot] =
    useState<PerformanceSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const leadsGenerated = performanceSnapshot.leadsGenerated;
  const callsScheduled = performanceSnapshot.callsScheduled;
  const qualifiedCount = performanceSnapshot.qualifiedCount;
  const preSaleCount = performanceSnapshot.preSaleCount;
  const notFitCount = performanceSnapshot.notFitCount;

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(
          `${backendUrl}/api/v1/dashboard/overview?range=${selectedRange}`,
          {
            headers: {
              accept: "application/json",
            },
            credentials: "include",
          }
        );
        const data = (await readJsonResponse(
          response,
          "Unable to load dashboard overview."
        )) as BackendDashboardOverview;

        if (!ignore) {
          setPerformanceSnapshot(mapDashboardOverview(data));
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load dashboard overview.";
          setLoadError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      ignore = true;
    };
  }, [selectedRange, showToast]);

  const performanceStages = [
    {
      label: "Leads Generated",
      value: leadsGenerated,
      ratio: "100%",
      description: "All records currently captured in the workspace.",
      tone: "bg-sky-50 text-sky-700",
      icon: <UserRound className="h-5 w-5" />,
    },
    {
      label: "Calls Scheduled",
      value: callsScheduled,
      ratio: `${percentage(callsScheduled, leadsGenerated)}%`,
      description: "Clients contacted recently enough to indicate active call momentum.",
      tone: "bg-indigo-50 text-indigo-700",
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      label: "Qualified",
      value: qualifiedCount,
      ratio: `${percentage(qualifiedCount, leadsGenerated)}%`,
      description: "Accounts with healthy enough scores to stay in active consideration.",
      tone: "bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      label: "Pre Sale",
      value: preSaleCount,
      ratio: `${percentage(preSaleCount, leadsGenerated)}%`,
      description: "Prospects still moving before close based on status and current quality.",
      tone: "bg-amber-50 text-amber-700",
      icon: <BriefcaseBusiness className="h-5 w-5" />,
    },
    {
      label: "Not a Fit",
      value: notFitCount,
      ratio: `${percentage(notFitCount, leadsGenerated)}%`,
      description: "Accounts whose score suggests low fit or weak conversion potential.",
      tone: "bg-rose-50 text-rose-700",
      icon: <TriangleAlert className="h-5 w-5" />,
    },
  ];

  const pipelineChartStages = [
    {
      label: "Leads Generated",
      value: leadsGenerated,
      width: 100,
      className:
        "border-sky-200 bg-[linear-gradient(90deg,#0ea5e9_0%,#38bdf8_100%)] text-white",
    },
    {
      label: "Calls Scheduled",
      value: callsScheduled,
      width: Math.max(42, percentage(callsScheduled, leadsGenerated)),
      className:
        "border-indigo-200 bg-[linear-gradient(90deg,#4f46e5_0%,#818cf8_100%)] text-white",
    },
    {
      label: "Qualified",
      value: qualifiedCount,
      width: Math.max(42, percentage(qualifiedCount, leadsGenerated)),
      className:
        "border-emerald-200 bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] text-white",
    },
    {
      label: "Pre Sale",
      value: preSaleCount,
      width: Math.max(42, percentage(preSaleCount, leadsGenerated)),
      className:
        "border-amber-200 bg-[linear-gradient(90deg,#f59e0b_0%,#fbbf24_100%)] text-slate-950",
    },
  ];

  const pipelineSignals = [
    {
      label: "Lead -> Call",
      value: `${percentage(callsScheduled, leadsGenerated)}%`,
    },
    {
      label: "Lead -> Qualified",
      value: `${percentage(qualifiedCount, leadsGenerated)}%`,
    },
    {
      label: "Lead -> Pre Sale",
      value: `${percentage(preSaleCount, leadsGenerated)}%`,
    },
    {
      label: "Not a Fit Rate",
      value: `${percentage(notFitCount, leadsGenerated)}%`,
    },
  ];

  return (
    <div>
      <section className="rounded-[30px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              User Performance
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Leads, calls, qualified, pre sale, and fit status
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "week" as const, label: "Week" },
              { key: "month" as const, label: "Month" },
              { key: "3month" as const, label: "3 Months" },
            ].map((item) => {
              const isActive = selectedRange === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedRange(item.key)}
                  className={
                    "rounded-full px-4 py-2 text-sm font-medium transition " +
                    (isActive
                      ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-200 hover:text-sky-700")
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading || loadError ? (
          <div
            className={
              "mt-5 flex items-center rounded-2xl border px-4 py-3 text-sm " +
              (loadError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-100 bg-sky-50 text-sky-700")
            }
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loadError || "Loading dashboard overview..."}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {performanceStages.map((stage) => (
            <PerformanceStageCard
              key={stage.label}
              icon={stage.icon}
              label={stage.label}
              value={stage.value}
              ratio={stage.ratio}
              description={stage.description}
              tone={stage.tone}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Pipeline chart</p>
                <p className="mt-1 text-sm text-slate-500">
                  A quick visual view of how the pipeline narrows across key stages for {performanceSnapshot.label.toLowerCase()}.
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {pipelineChartStages.map((stage) => (
                <div key={stage.label} className="flex justify-center">
                  <div
                    className={
                      "rounded-[20px] border px-4 py-3 shadow-sm transition " +
                      stage.className
                    }
                    style={{ width: `${stage.width}%` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{stage.label}</span>
                      <span className="text-sm font-semibold">{stage.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50/80 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-rose-700">Not a Fit</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Accounts that are falling out of the funnel and should not absorb more time.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tracking-tight text-rose-700">
                    {notFitCount}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-600/80">
                    {percentage(notFitCount, leadsGenerated)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200/90 bg-white p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Conversion Signals
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {performanceSnapshot.label} conversion view
            </h3>

            <div className="mt-5 space-y-3">
              {pipelineSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="flex items-center justify-between gap-4 rounded-[20px] bg-slate-50/90 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {signal.label}
                  </span>
                  <span className="text-lg font-semibold tracking-tight text-slate-950">
                    {signal.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-slate-700">
              The key drop for {performanceSnapshot.label.toLowerCase()} is between qualified and pre sale. That is the stage where sharper follow-up and faster action can improve performance most.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
