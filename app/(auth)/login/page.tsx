"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { backendUrl } from "@/lib/backend";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUserFromResponse } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError("Password incorrect.");
        return;
      }

      const user = setUserFromResponse(data, email);

      showToast("Login successfully completed.", "success");
      router.push(user.role === "manager" ? "/manager/dashboard" : "/");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f7fb_52%,#eef3ff_100%)] px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-[120%] rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute right-1/2 top-24 h-80 w-80 translate-x-[125%] rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-cyan-100/45 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md rounded-3xl border-white/70 bg-white/90 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <CardHeader className="space-y-6 px-6 pb-2 pt-8 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
              IX
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-950">
                InziX
              </p>
              <p className="text-xs text-slate-500">B2B SaaS Platform</p>
            </div>
          </div>

          <div className="space-y-1">
            <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950">
              Welcome back
            </CardTitle>
            <p className="text-sm text-slate-500">Log in to your account</p>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4 sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {}}
                  className="text-sm font-medium text-sky-700 transition hover:text-sky-800"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-sky-600 text-sm font-medium text-white shadow-[0_12px_30px_rgba(2,132,199,0.28)] transition hover:bg-sky-700"
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </Button>
          </form>

          {error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : null}

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
              or
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-sky-700 transition hover:text-sky-800"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
