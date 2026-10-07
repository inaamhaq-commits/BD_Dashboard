"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BadgePlus,
  Building2,
  Globe2,
  Mail,
  MapPin,
  SendHorizontal,
  Sparkles,
  Target,
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  company: string;
  role: string;
  region: string;
  email: string;
  fitScore: number;
  source: string;
};

const generatedLeadsSeed: Lead[] = [
  {
    id: "lead-1",
    name: "Olivia Carter",
    company: "PulseForge AI",
    role: "Head of Growth",
    region: "United States",
    email: "olivia@pulseforge.ai",
    fitScore: 9.1,
    source: "Inbound campaign",
  },
  {
    id: "lead-2",
    name: "Marcus Reed",
    company: "Northlane Systems",
    role: "Revenue Operations Lead",
    region: "Canada",
    email: "marcus@northlane.io",
    fitScore: 8.6,
    source: "LinkedIn search",
  },
  {
    id: "lead-3",
    name: "Sophia Bennett",
    company: "Elevate Commerce",
    role: "Sales Director",
    region: "United Kingdom",
    email: "sophia@elevatecommerce.co",
    fitScore: 8.2,
    source: "Referral",
  },
  {
    id: "lead-4",
    name: "Daniel Moore",
    company: "Vertex Scale",
    role: "Partnership Manager",
    region: "United States",
    email: "daniel@vertexscale.com",
    fitScore: 7.8,
    source: "Outbound list",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getLeadTone(score: number) {
  if (score >= 8.8) {
    return "bg-emerald-500";
  }

  if (score >= 8) {
    return "bg-sky-500";
  }

  return "bg-amber-500";
}

function generateLeadSet(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("health")) {
    return [
      {
        id: "lead-health-1",
        name: "Avery Mason",
        company: "CareMetric Health",
        role: "VP Partnerships",
        region: "United States",
        email: "avery@caremetric.com",
        fitScore: 9.0,
        source: "Lead generator",
      },
      {
        id: "lead-health-2",
        name: "Noah Foster",
        company: "ClinicStack",
        role: "Business Development Manager",
        region: "United States",
        email: "noah@clinicstack.com",
        fitScore: 8.5,
        source: "Lead generator",
      },
      {
        id: "lead-health-3",
        name: "Emma Brooks",
        company: "WellPath Digital",
        role: "Growth Lead",
        region: "Canada",
        email: "emma@wellpathdigital.com",
        fitScore: 8.1,
        source: "Lead generator",
      },
    ];
  }

  if (normalized.includes("saas") || normalized.includes("b2b")) {
    return [
      {
        id: "lead-saas-1",
        name: "Liam Parker",
        company: "ScaleLoop",
        role: "Head of Partnerships",
        region: "United States",
        email: "liam@scaleloop.io",
        fitScore: 9.2,
        source: "Lead generator",
      },
      {
        id: "lead-saas-2",
        name: "Chloe Adams",
        company: "CloudMint",
        role: "Sales Operations Manager",
        region: "United Kingdom",
        email: "chloe@cloudmint.io",
        fitScore: 8.7,
        source: "Lead generator",
      },
      {
        id: "lead-saas-3",
        name: "Ryan Hughes",
        company: "StackBridge",
        role: "Commercial Lead",
        region: "Australia",
        email: "ryan@stackbridge.com",
        fitScore: 8.3,
        source: "Lead generator",
      },
      {
        id: "lead-saas-4",
        name: "Natalie Ross",
        company: "Orbit Works",
        role: "Revenue Growth Manager",
        region: "United States",
        email: "natalie@orbitworks.io",
        fitScore: 7.9,
        source: "Lead generator",
      },
    ];
  }

  return generatedLeadsSeed;
}

export function LeadsPage() {
  const [prompt, setPrompt] = useState(
    "Generate B2B SaaS leads from the US and UK for partnership and growth roles."
  );
  const [generatedLeads, setGeneratedLeads] = useState<Lead[]>(generatedLeadsSeed);

  const averageFitScore = useMemo(() => {
    if (!generatedLeads.length) return 0;

    return (
      generatedLeads.reduce((sum, lead) => sum + lead.fitScore, 0) /
      generatedLeads.length
    );
  }, [generatedLeads]);

  function handleGenerateLeads() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setGeneratedLeads(generateLeadSet(trimmed));
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <div className="rounded-[30px] border border-slate-200/90 bg-[linear-gradient(145deg,#020617_0%,#0f172a_36%,#0b4f6c_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-100/70">
            Lead Generator
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Create targeted leads from one message
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/78">
            Describe the kind of prospects you want, generate a focused lead list, and review the results as clean lead cards.
          </p>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/8 p-3">
            <div className="flex items-end gap-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the leads you want to generate..."
                className="min-h-[110px] rounded-[22px] border-0 bg-white/92 px-4 py-3 text-sm leading-7 text-slate-800 shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                onClick={handleGenerateLeads}
                className="h-11 shrink-0 rounded-2xl bg-sky-500 px-5 text-sm font-medium text-white shadow-[0_14px_30px_rgba(14,165,233,0.28)] hover:bg-sky-400"
              >
                <SendHorizontal className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[28px] border border-slate-200/90 bg-white/95 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Leads Generated
              </p>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <BadgePlus className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {generatedLeads.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Total lead cards generated from the current prompt.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200/90 bg-white/95 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Average Fit Score
              </p>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {averageFitScore.toFixed(1)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Average quality estimate across the generated leads.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {generatedLeads.map((lead) => {
          const initials = getInitials(lead.name);
          const progressWidth = Math.max(12, Math.min(100, lead.fitScore * 10));

          return (
            <div
              key={lead.id}
              className="group rounded-[28px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_20px_45px_rgba(14,165,233,0.10)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12 border border-slate-200">
                    <AvatarFallback className="bg-slate-950 text-sm font-semibold text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-tight text-slate-950">
                      {lead.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">{lead.role}</p>
                  </div>
                </div>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {lead.source}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{lead.company}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{lead.region}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe2 className="h-4 w-4 text-slate-400" />
                  <span>Lead type: Outbound opportunity</span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${getLeadTone(lead.fitScore)}`} />
                      <span className="font-medium">
                        Fit Score: {lead.fitScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${getLeadTone(lead.fitScore)}`}
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
