"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toDisplayMessage } from "@/lib/error-message";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastTone = "success" | "error";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
} | null;

type ToastContextValue = {
  showToast: (message: unknown, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast(message, tone = "success") {
        const id = Date.now();
        setToast({ id, message: toDisplayMessage(message), tone });

        window.setTimeout(() => {
          setToast((current) => (current?.id === id ? null : current));
        }, 2600);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm justify-end">
        {toast ? (
          <div
            className={
              "pointer-events-auto flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] animate-in fade-in slide-in-from-top-4 duration-300 " +
              (toast.tone === "success"
                ? "border-emerald-200 bg-white text-slate-900"
                : "border-rose-200 bg-white text-slate-900")
            }
          >
            <div
              className={
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl " +
                (toast.tone === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600")
              }
            >
              {toast.tone === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {toast.tone === "success" ? "Success" : "Error"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {toast.message}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
