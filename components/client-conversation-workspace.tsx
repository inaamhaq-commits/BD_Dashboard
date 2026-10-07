"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";
import {
  BackendClient,
  Client,
  ClientStageKey,
  clientStageOptions,
  getScoreTone,
  mapBackendClient,
} from "@/components/client-data";
import { backendUrl } from "@/lib/backend";
import { getErrorMessage as getBackendErrorMessage } from "@/lib/error-message";
import {
  ArrowLeft,
  BrainCircuit,
  Building2,
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";

type SenderType = "client" | "user" | "ai" | "finalized";

type BackendMessage = {
  id?: string;
  message_id?: string;
  sender_type?: SenderType;
  message_text?: string;
  content?: string;
  text?: string;
  created_at?: string;
  updated_at?: string;
};

type BackendSuggestion = {
  id?: string;
  suggestion_id?: string;
  suggested_response?: string;
  response?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
};

type BackendConversation = {
  id?: string;
  conversation_id?: string;
  user_id?: string;
  client_id?: string;
  project_id?: string;
  title?: string;
  status?: string;
  messages?: BackendMessage[];
  suggestions?: BackendSuggestion[];
  ai_suggestions?: BackendSuggestion[];
};

type ConversationMessage = {
  id: string;
  role: SenderType;
  message: string;
  time: string;
};

type Suggestion = {
  id: string;
  response: string;
};

type CoachItem = {
  id: string;
  role: "coach" | "user";
  message: string;
  time: string;
};

type ClientConversationWorkspaceProps = {
  clientId: string;
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

function normalizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getEntityId(entity: {
  id?: string;
  conversation_id?: string;
  message_id?: string;
  suggestion_id?: string;
}) {
  return (
    entity.id ??
    entity.conversation_id ??
    entity.message_id ??
    entity.suggestion_id ??
    crypto.randomUUID()
  );
}

function getTimeLabel(value?: string) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mapMessage(message: BackendMessage): ConversationMessage {
  return {
    id: getEntityId(message),
    role: message.sender_type ?? "client",
    message:
      normalizeText(message.message_text) ||
      normalizeText(message.content) ||
      normalizeText(message.text),
    time: getTimeLabel(message.created_at ?? message.updated_at),
  };
}

function mapSuggestion(suggestion: BackendSuggestion): Suggestion {
  return {
    id: getEntityId(suggestion),
    response:
      normalizeText(suggestion.suggested_response) ||
      normalizeText(suggestion.response) ||
      normalizeText(suggestion.content),
  };
}

function normalizeConversation(data: BackendConversation) {
  const rawSuggestions = data.suggestions ?? data.ai_suggestions ?? [];

  return {
    id: getEntityId(data),
    userId: normalizeText(data.user_id),
    clientId: normalizeText(data.client_id),
    projectId: normalizeText(data.project_id),
    title: normalizeText(data.title),
    status: normalizeText(data.status) || "active",
    messages: (data.messages ?? []).map(mapMessage).filter((item) => item.message),
    suggestions: rawSuggestions
      .map(mapSuggestion)
      .filter((item) => item.response),
  };
}

function getCurrentTimeLabel() {
  return getTimeLabel();
}

function parseStreamChunk(chunk: string) {
  return chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "data: [DONE]")
    .map((line) => (line.startsWith("data:") ? line.slice(5).trim() : line))
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        return (
          normalizeText(parsed.token) ||
          normalizeText(parsed.delta) ||
          normalizeText(parsed.text) ||
          normalizeText(parsed.content) ||
          normalizeText(parsed.suggested_response)
        );
      } catch {
        return line;
      }
    })
    .join("");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getClientStageValue(client: Client, stage: ClientStageKey) {
  if (stage === "calls_scheduled") {
    return client.callsScheduled;
  }

  if (stage === "qualified") {
    return client.qualified;
  }

  if (stage === "pre_sale") {
    return client.preSale;
  }

  return client.notAFit;
}

export function ClientConversationWorkspace({
  clientId,
}: ClientConversationWorkspaceProps) {
  const { showToast } = useToast();
  const streamTimerRef = useRef<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [conversationProjectId, setConversationProjectId] = useState("");
  const [conversationTitle, setConversationTitle] = useState("");
  const [conversationStatus, setConversationStatus] = useState("active");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [clientMessageDraft, setClientMessageDraft] = useState("");
  const [suggestedReply, setSuggestedReply] = useState("");
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachInput, setCoachInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [savingStage, setSavingStage] = useState<ClientStageKey | null>(null);
  const [loadError, setLoadError] = useState("");
  const [coachMessages, setCoachMessages] = useState<CoachItem[]>([
    {
      id: "coach-intro",
      role: "coach",
      message:
        "I can help tighten, warm up, or reframe the draft before you finalize it.",
      time: "Now",
    },
  ]);

  const workspaceTitle = conversationTitle || (client
    ? `Conversation with ${client.name}`
    : "Client conversation");
  const latestClientMessageId = useMemo(() => {
    return [...messages].reverse().find((item) => item.role === "client")?.id;
  }, [messages]);
  const canUseConversation = Boolean(conversationId);

  const loadConversation = useCallback(async (id: string) => {
    const response = await fetch(`${backendUrl}/api/v1/conversations/${id}`, {
      headers: {
        accept: "application/json",
      },
      credentials: "include",
    });
    const data = (await readJsonResponse(
      response,
      "Unable to load conversation."
    )) as BackendConversation;
    const normalized = normalizeConversation(data);

    setConversationId(normalized.id);
    setConversationProjectId(normalized.projectId);
    setConversationTitle(normalized.title);
    setConversationStatus(normalized.status);
    setMessages(normalized.messages);

    const latestSuggestion = normalized.suggestions.at(-1) ?? null;
    setSuggestion(latestSuggestion);
    setSuggestedReply(latestSuggestion?.response ?? "");
  }, []);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;

    throw new Error("No conversation found for this client.");
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [clientResponse, conversationsResponse] =
          await Promise.all([
            fetch(`${backendUrl}/api/v1/clients/${clientId}`, {
              headers: {
                accept: "application/json",
              },
              credentials: "include",
            }),
            fetch(`${backendUrl}/api/v1/conversations?client_id=${clientId}`, {
              headers: {
                accept: "application/json",
              },
              credentials: "include",
            }),
          ]);
        const clientData = (await readJsonResponse(
          clientResponse,
          "Unable to load client."
        )) as BackendClient;
        const conversationsData = await readJsonResponse(
          conversationsResponse,
          "Unable to load conversations."
        );

        if (ignore) return;

        const mappedClient = mapBackendClient(clientData);
        const rawConversations = Array.isArray(conversationsData)
          ? conversationsData
          : (
              conversationsData as {
                conversations?: BackendConversation[];
              }
            ).conversations ?? [];
        const conversations = rawConversations.map(normalizeConversation);
        const activeConversation = conversations[0];

        setClient(mappedClient);

        if (activeConversation) {
          setConversationId(activeConversation.id);
          setConversationProjectId(activeConversation.projectId);
          setConversationTitle(activeConversation.title);
          setConversationStatus(activeConversation.status);
          setMessages(activeConversation.messages);
          setSuggestion(activeConversation.suggestions.at(-1) ?? null);
          setSuggestedReply(activeConversation.suggestions.at(-1)?.response ?? "");
          await loadConversation(activeConversation.id);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Unable to load workspace.";
          setLoadError(message);
          showToast(message, "error");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [clientId, loadConversation, showToast]);

  function streamText(text: string) {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
    }

    setSuggestedReply("");

    let index = 0;
    streamTimerRef.current = window.setInterval(() => {
      index += Math.max(1, Math.ceil(text.length / 80));
      setSuggestedReply(text.slice(0, index));

      if (index >= text.length && streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }, 24);
  }

  async function readSuggestionResponse(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json") || !response.body) {
      const data = (await readJsonResponse(
        response,
        "Unable to generate AI response."
      )) as BackendSuggestion | { suggestion?: BackendSuggestion };
      const rawSuggestion =
        "suggestion" in data && data.suggestion ? data.suggestion : data;
      const nextSuggestion = mapSuggestion(rawSuggestion as BackendSuggestion);

      streamText(nextSuggestion.response);

      return nextSuggestion;
    }

    if (!response.ok) {
      const data = await response.text();
      throw new Error(data || "Unable to generate AI response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    setSuggestedReply("");

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      const chunk = parseStreamChunk(decoder.decode(value, { stream: true }));
      responseText += chunk;
      setSuggestedReply((current) => current + chunk);
    }

    return {
      id: crypto.randomUUID(),
      response: responseText.trim(),
    };
  }

  async function handleGenerateSuggestion(
    messageId = latestClientMessageId,
    id = conversationId
  ) {
    if (!messageId || !id || isSuggesting) return;

    setIsSuggesting(true);
    setSuggestion(null);

    try {
      const response = await fetch(`${backendUrl}/api/v1/conversations/${id}/suggest`, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream, text/plain",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message_id: messageId,
          limit: 5,
        }),
        credentials: "include",
      });
      const nextSuggestion = await readSuggestionResponse(response);

      setSuggestion(nextSuggestion);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate AI response.";
      showToast(message, "error");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleAddClientMessage() {
    const trimmed = clientMessageDraft.trim();
    if (!trimmed || isSavingMessage || isSuggesting) return;

    setIsSavingMessage(true);

    try {
      const id = await ensureConversation();
      const response = await fetch(
        `${backendUrl}/api/v1/conversations/${id}/messages`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender_type: "client",
            message_text: trimmed,
          }),
          credentials: "include",
        }
      );
      const data = (await readJsonResponse(
        response,
        "Unable to save client message."
      )) as BackendMessage;
      const savedMessage = mapMessage({
        sender_type: "client",
        message_text: trimmed,
        ...data,
      });

      setMessages((current) => [...current, savedMessage]);
      setClientMessageDraft("");
      await handleGenerateSuggestion(savedMessage.id, id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save client message.";
      showToast(message, "error");
    } finally {
      setIsSavingMessage(false);
    }
  }

  async function handleSaveSuggestionEdit() {
    const trimmed = suggestedReply.trim();
    if (!trimmed || !suggestion || !conversationId) return false;

    try {
      const response = await fetch(
        `${backendUrl}/api/v1/conversations/${conversationId}/suggestions/${suggestion.id}`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            suggested_response: trimmed,
          }),
          credentials: "include",
        }
      );
      const data = (await readJsonResponse(
        response,
        "Unable to save suggestion edit."
      )) as BackendSuggestion;
      const updatedSuggestion = mapSuggestion({
        ...data,
        suggestion_id: suggestion.id,
        suggested_response: trimmed,
      });

      setSuggestion(updatedSuggestion);
      setSuggestedReply(updatedSuggestion.response);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save suggestion edit.";
      showToast(message, "error");
      return false;
    }
  }

  async function handleSaveFinalReply() {
    const trimmed = suggestedReply.trim();
    if (!trimmed || !suggestion || !conversationId || isFinalizing) return;

    setIsFinalizing(true);

    try {
      const savedEdit = await handleSaveSuggestionEdit();

      if (!savedEdit) return;

      const response = await fetch(
        `${backendUrl}/api/v1/conversations/${conversationId}/suggestions/${suggestion.id}/finalize`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            finalized_response: trimmed,
          }),
          credentials: "include",
        }
      );
      const data = (await readJsonResponse(
        response,
        "Unable to finalize reply."
      )) as BackendMessage;
      const finalizedMessage = mapMessage({
        sender_type: "finalized",
        message_text: trimmed,
        ...data,
      });

      setMessages((current) => [...current, finalizedMessage]);
      showToast("Final reply saved.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to finalize reply.";
      showToast(message, "error");
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleCopySuggestedReply() {
    const trimmed = suggestedReply.trim();
    if (!trimmed) return;

    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function handleSendCoachMessage() {
    const trimmed = coachInput.trim();
    if (!trimmed || !conversationId || isCoachLoading) return;

    const userMessage: CoachItem = {
      id: crypto.randomUUID(),
      role: "user",
      message: trimmed,
      time: getCurrentTimeLabel(),
    };

    setCoachMessages((current) => [...current, userMessage]);
    setCoachInput("");
    setIsCoachLoading(true);

    try {
      const response = await fetch(
        `${backendUrl}/api/v1/conversations/${conversationId}/coach`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            question: trimmed,
            draft_response: suggestedReply,
          }),
          credentials: "include",
        }
      );
      const data = (await readJsonResponse(
        response,
        "Unable to ask AI Coach."
      )) as { coach_response?: string };
      const coachResponse = normalizeText(data.coach_response);

      setCoachMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "coach",
          message: coachResponse || "I could not generate a coach response.",
          time: getCurrentTimeLabel(),
        },
      ]);

      if (coachResponse) {
        setSuggestedReply(coachResponse);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to ask AI Coach.";
      showToast(message, "error");
    } finally {
      setIsCoachLoading(false);
    }
  }

  async function handleStageChange(stage: ClientStageKey, checked: boolean) {
    if (!client || savingStage) return;

    setSavingStage(stage);

    try {
      const response = await fetch(`${backendUrl}/api/v1/clients/${client.id}`, {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          [stage]: checked,
        }),
        credentials: "include",
      });
      const data = (await readJsonResponse(
        response,
        "Unable to update client stage."
      )) as BackendClient;

      setClient(mapBackendClient(data));
      showToast("Client stage updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update client stage.";
      showToast(message, "error");
    } finally {
      setSavingStage(null);
    }
  }

  const initials = getInitials(client?.name ?? "Client");
  const progressWidth = Math.max(10, Math.min(100, (client?.chatScore ?? 0) * 10));

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-12.25rem)] items-center justify-center rounded-[24px] border border-slate-200 bg-white/80 text-sm font-medium text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading client conversation...
      </div>
    );
  }

  if (loadError || !client) {
    return (
      <div className="flex min-h-[calc(100vh-12.25rem)] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 text-center">
        <Sparkles className="h-10 w-10 text-sky-600" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
          Client workspace unavailable
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {loadError || "Unable to load this client."}
        </p>
        <Link
          href="/clients"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
        >
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 gap-4 xl:h-[calc(100vh-12.25rem)] xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.58fr)] xl:overflow-hidden">
      <section className="order-2 flex min-h-[44rem] flex-col overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] xl:order-1 xl:min-h-0">
        <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-700/65">
                Chat Workspace
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                {workspaceTitle}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-500">
                {conversationId
                  ? `Status: ${conversationStatus}${
                      conversationProjectId ? ` - Project ${conversationProjectId}` : ""
                    }`
                  : "No conversation found for this client yet."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/clients"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            {messages.length ? (
              messages.map((item) => {
                const isReply = item.role !== "client";

                return (
                  <div
                    key={item.id}
                    className={isReply ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        "max-w-[88%] rounded-[20px] px-4 py-3 shadow-sm sm:max-w-[76%] " +
                        (isReply
                          ? "bg-slate-950 text-white"
                          : "border border-sky-100 bg-sky-50/85 text-slate-800")
                      }
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <span
                          className={
                            isReply
                              ? "font-semibold text-slate-200"
                              : "font-semibold text-sky-700"
                          }
                        >
                          {isReply ? "Finalized reply" : client.name}
                        </span>
                        <span className="text-slate-400">{item.time}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {item.message}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/80 p-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-sky-600" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Paste the client message below to start.
                </p>
              </div>
            )}

            <div className="rounded-[22px] border border-amber-100 bg-amber-50/85 p-3 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <Sparkles className="h-4 w-4" />
                    AI response to send
                    {isSuggesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleGenerateSuggestion()}
                      disabled={!latestClientMessageId || !conversationId || isSuggesting}
                      className="h-9 rounded-xl border-amber-200 bg-white px-3 text-sm text-amber-800 hover:bg-amber-50"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopySuggestedReply}
                      disabled={!suggestedReply.trim()}
                      className="h-9 rounded-xl border-amber-200 bg-white px-3 text-sm text-amber-800 hover:bg-amber-50"
                    >
                      {copied ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCoachOpen(true)}
                      disabled={!conversationId}
                      className="h-9 rounded-xl border-amber-200 bg-white px-3 text-sm text-amber-800 hover:bg-amber-50"
                    >
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      Ask Coach
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={suggestedReply}
                  onChange={(event) => setSuggestedReply(event.target.value)}
                  placeholder="AI response will stream here after the message is saved..."
                  className="min-h-[112px] rounded-[18px] border border-amber-100 bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700 shadow-none focus-visible:ring-0"
                />

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveSuggestionEdit()}
                    disabled={!suggestion || !suggestedReply.trim()}
                    className="h-9 rounded-xl border-sky-200 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-50"
                  >
                    Save edit
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveFinalReply}
                    disabled={!suggestion || !suggestedReply.trim() || isFinalizing}
                    className="h-9 rounded-xl bg-sky-600 px-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(2,132,199,0.22)] hover:bg-sky-700"
                  >
                    {isFinalizing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="mr-2 h-4 w-4" />
                    )}
                    Finalize
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white/90 px-4 py-3 sm:px-5">
          <div className="mx-auto w-full max-w-4xl">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              {!canUseConversation ? (
                <p className="px-2 py-3 text-sm text-slate-500">
                  This client does not have a conversation yet.
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCoachOpen(true)}
                  disabled={!conversationId}
                  className="h-10 shrink-0 rounded-xl border-sky-200 bg-white px-3 text-sm font-medium text-sky-700 hover:border-sky-300 hover:bg-sky-50"
                >
                  <BrainCircuit className="h-4 w-4" />
                </Button>

                <Textarea
                  value={clientMessageDraft}
                  onChange={(event) => setClientMessageDraft(event.target.value)}
                  placeholder="Paste client message..."
                  className="min-h-0 flex-1 resize-none rounded-[16px] border-0 bg-white px-4 py-2.5 text-sm leading-6 shadow-none focus-visible:ring-0"
                  rows={1}
                />

                <Button
                  type="button"
                  onClick={handleAddClientMessage}
                  disabled={
                    !clientMessageDraft.trim() ||
                    isSavingMessage ||
                    isSuggesting ||
                    !conversationId
                  }
                  className="h-10 shrink-0 rounded-xl bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {isSavingMessage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="mr-2 h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="order-1 min-h-0 xl:order-2 xl:h-full xl:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-3 rounded-[24px] border border-slate-200/90 bg-white p-3 shadow-[0_12px_36px_rgba(15,23,42,0.05)] xl:h-full xl:overflow-y-auto">
          <div className="overflow-hidden rounded-[22px] bg-[linear-gradient(160deg,#0f172a_0%,#111827_45%,#0f766e_100%)] p-4 text-white shadow-[0_14px_30px_rgba(15,23,42,0.14)]">
            <div className="flex items-start justify-between gap-4">
              <Avatar className="h-14 w-14 border border-white/15 shadow-sm">
                <AvatarFallback className="bg-white/12 text-xl font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-sky-100">
                {client.status}
              </span>
            </div>

            <div className="mt-4">
              <h1 className="truncate text-xl font-semibold tracking-tight text-white">
                {client.name}
              </h1>
              <p className="mt-1 text-sm text-sky-100/70">{client.company}</p>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/10 bg-white/8 p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-100/65">
                Client Score
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-tight">
                  {client.chatScore.toFixed(1)}
                </p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky-100">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/12">
                <div
                  className={"h-full rounded-full " + getScoreTone(client.chatScore)}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              Client Stage
            </p>

            <div className="mt-3 space-y-2">
              {clientStageOptions.map((stage) => {
                const checked = getClientStageValue(client, stage.key);
                const isSaving = savingStage === stage.key;

                return (
                  <label
                    key={stage.key}
                    className={
                      "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-[16px] border px-3 py-2 text-sm font-medium transition " +
                      (checked
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-slate-50/90 text-slate-700 hover:border-sky-200")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(savingStage)}
                        onChange={(event) =>
                          handleStageChange(stage.key, event.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 accent-sky-600 disabled:cursor-not-allowed"
                      />
                      <span className="truncate">{stage.label}</span>
                    </span>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600" />
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              Complete Profile
            </p>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="rounded-[16px] bg-slate-50/90 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </div>
                <p className="truncate text-sm text-slate-700">
                  {client.email || "Not added"}
                </p>
              </div>

              <div className="rounded-[16px] bg-slate-50/90 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </div>
                <p className="text-sm text-slate-700">
                  {client.phone || "Not added"}
                </p>
              </div>

              <div className="rounded-[16px] bg-slate-50/90 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Contact
                </div>
                <p className="text-sm text-slate-700">
                  Last contacted {client.lastContacted}
                </p>
              </div>

              <div className="rounded-[16px] bg-slate-50/90 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  <Link2 className="h-3.5 w-3.5" />
                  LinkedIn
                </div>
                <p className="truncate text-sm text-slate-700">
                  {client.linkedinUrl || "Not added"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {coachOpen ? (
        <div className="coach-overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-[rgba(248,250,252,0.78)] px-4 py-6">
          <div className="coach-panel-enter relative flex h-[min(78vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-[34px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_40px_120px_rgba(15,23,42,0.24)] ring-1 ring-sky-100/80">
            <div className="h-1 bg-[linear-gradient(90deg,#38bdf8_0%,#0ea5e9_45%,#7dd3fc_100%)]" />
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-700/65">
                    AI Assistant
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    AI Coach
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setCoachOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                {coachMessages.map((item) => {
                  const isUser = item.role === "user";

                  return (
                    <div
                      key={item.id}
                      className={isUser ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          "max-w-[88%] rounded-[24px] px-4 py-3 text-sm shadow-sm sm:max-w-[78%] " +
                          (isUser
                            ? "bg-slate-950 text-white"
                            : "border border-sky-100 bg-sky-50/85 text-slate-700")
                        }
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs">
                          <span
                            className={
                              isUser
                                ? "font-semibold text-slate-200"
                                : "font-semibold text-sky-700"
                            }
                          >
                            {isUser ? "You" : "AI Coach"}
                          </span>
                          <span className="text-slate-400">{item.time}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-7">
                          {item.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isCoachLoading ? (
                  <div className="flex justify-start">
                    <div className="rounded-[24px] border border-sky-100 bg-sky-50/85 px-4 py-3 text-sm text-slate-700 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/90 px-4 py-4 sm:px-6">
              <div className="mx-auto w-full max-w-4xl">
                <div className="rounded-[30px] border border-slate-200 bg-slate-50/80 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-3">
                    <Input
                      value={coachInput}
                      onChange={(event) => setCoachInput(event.target.value)}
                      placeholder="Ask AI Coach how to improve the response..."
                      className="h-11 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      onClick={handleSendCoachMessage}
                      disabled={!coachInput.trim() || !conversationId || isCoachLoading}
                      className="h-11 rounded-2xl bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-700"
                    >
                      <SendHorizontal className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
