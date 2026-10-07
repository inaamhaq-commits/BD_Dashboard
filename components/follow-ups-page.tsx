"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  clients,
  getScoreTone,
  getStatusClasses,
  type Client,
} from "@/components/client-data";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ChevronDown,
  Clock3,
  Mail,
  Search,
  Sparkles,
} from "lucide-react";

type Priority = "High" | "Medium" | "Low";

type FollowUpItem = {
  client: Client;
  dueLabel: string;
  dueTone: string;
  priority: Priority;
  priorityTone: string;
  followUpReason: string;
  nextAction: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFollowUpReason(client: Client) {
  if (client.status === "Needs Follow-up") {
    return "The conversation has cooled off and this client needs a prompt follow-up to keep momentum moving.";
  }

  if (client.status === "New") {
    return "This is a new relationship, so a timely follow-up helps establish trust and keep the first touchpoint active.";
  }

  if (client.chatScore < 8.5) {
    return "The engagement score suggests there is room to strengthen the relationship with a sharper next message.";
  }

  return "The client is healthy overall, but a light follow-up keeps the relationship warm and visible.";
}

function getNextAction(client: Client) {
  if (client.status === "Needs Follow-up") {
    return "Send a concise check-in with one clear next step and a simple response option.";
  }

  if (client.status === "New") {
    return "Share a friendly follow-up that confirms context and offers a quick walkthrough or summary.";
  }

  if (client.chatScore < 8.5) {
    return "Use AI Coach to tighten the message tone and send a more value-driven response.";
  }

  return "Send a short relationship-maintenance note and keep the thread active.";
}

function getFollowUpMeta(client: Client): Omit<
  FollowUpItem,
  "client"
> {
  if (client.status === "Needs Follow-up" || client.chatScore < 7.2) {
    return {
      dueLabel: "Follow up today",
      dueTone: "text-rose-600 bg-rose-50 border-rose-200",
      priority: "High",
      priorityTone: "text-rose-700 bg-rose-50 border-rose-200",
      followUpReason: getFollowUpReason(client),
      nextAction: getNextAction(client),
    };
  }

  if (client.status === "New" || client.chatScore < 8.4) {
    return {
      dueLabel: "Follow up in 24h",
      dueTone: "text-amber-700 bg-amber-50 border-amber-200",
      priority: "Medium",
      priorityTone: "text-amber-700 bg-amber-50 border-amber-200",
      followUpReason: getFollowUpReason(client),
      nextAction: getNextAction(client),
    };
  }

  return {
    dueLabel: "Follow up this week",
    dueTone: "text-sky-700 bg-sky-50 border-sky-200",
    priority: "Low",
    priorityTone: "text-sky-700 bg-sky-50 border-sky-200",
    followUpReason: getFollowUpReason(client),
    nextAction: getNextAction(client),
  };
}

function buildFollowUpItems() {
  return clients
    .map((client) => ({
      client,
      ...getFollowUpMeta(client),
    }))
    .sort((a, b) => {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      const scoreDelta = a.client.chatScore - b.client.chatScore;

      if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }

      return scoreDelta;
    });
}

export function FollowUpsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const followUpItems = useMemo(() => buildFollowUpItems(), []);

  const filteredItems = followUpItems.filter((item) => {
    const haystack =
      `${item.client.name} ${item.client.company} ${item.followUpReason} ${item.priority}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ? true : item.priority === filter;

    return matchesSearch && matchesFilter;
  });

  const highPriorityCount = followUpItems.filter(
    (item) => item.priority === "High"
  ).length;
  const needsFollowUpCount = followUpItems.filter(
    (item) => item.client.status === "Needs Follow-up"
  ).length;
  const averageScore =
    followUpItems.reduce((sum, item) => sum + item.client.chatScore, 0) /
    followUpItems.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Follow-ups
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              High Priority
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {highPriorityCount}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Needs Follow-up
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {needsFollowUpCount}
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Average Score
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {averageScore.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="flex h-[calc(100vh-16rem)] min-h-[38rem] flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search follow-ups..."
                className="h-11 rounded-xl border-slate-200 bg-white pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
              />
            </div>

            <div className="relative">
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-500/30 sm:w-44"
              >
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
            {filteredItems.map((item) => {
              const initials = getInitials(item.client.name);
              const progressWidth = Math.max(
                10,
                Math.min(100, item.client.chatScore * 10)
              );

              return (
                <div
                  key={item.client.id}
                  className="group rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_45px_rgba(14,165,233,0.10)]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 border border-slate-200">
                          <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-lg font-semibold tracking-tight text-slate-950">
                              {item.client.name}
                            </p>
                            <span
                              className={
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium " +
                                getStatusClasses(item.client.status)
                              }
                            >
                              {item.client.status}
                            </span>
                            <span
                              className={
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium " +
                                item.priorityTone
                              }
                            >
                              {item.priority} Priority
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.client.company}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                            <BellRing className="h-3.5 w-3.5" />
                            Follow-up Reason
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            {item.followUpReason}
                          </p>
                        </div>

                        <div className="rounded-[22px] bg-slate-50/80 px-4 py-3">
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Next Action
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            {item.nextAction}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span
                          className={
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium " +
                            item.dueTone
                          }
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.dueLabel}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {item.client.email}
                        </span>
                        <span>Last contacted {item.client.lastContacted}</span>
                      </div>
                    </div>

                    <div className="xl:w-[15rem] xl:shrink-0">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                              Follow-up Score
                            </p>
                            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                              {item.client.chatScore.toFixed(1)}
                            </p>
                          </div>
                          <span
                            className={
                              "flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm " +
                              getScoreTone(item.client.chatScore)
                            }
                          >
                            <Sparkles className="h-5 w-5" />
                          </span>
                        </div>

                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={
                              "h-full rounded-full transition-all " +
                              getScoreTone(item.client.chatScore)
                            }
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>

                        <Link
                          href={`/clients/${item.client.id}`}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          Open client workspace
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50/60 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                  <BellRing className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  No follow-ups found
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Try another search or priority filter to view the clients who need attention.
                </p>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
