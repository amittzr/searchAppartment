"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Home, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

// Inner component isolated so useSearchParams() is wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Redirect to the originally requested page (or dashboard)
        router.replace(from);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? "Incorrect password. Please try again.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Password field */}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="Enter password"
          autoComplete="current-password"
          autoFocus
          className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" strokeWidth={2} />
          ) : (
            <Eye className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !password.trim()}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
            <Home className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">ApartmentTracker</h1>
            <p className="text-sm text-slate-500 mt-1">Find your home together 🏡</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Enter your shared password</h2>
          </div>

          {/* Suspense required because useSearchParams() suspends in Next.js 15 */}
          <Suspense fallback={<div className="h-32 animate-pulse bg-slate-100 rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          This is a private app for the two of you only.
        </p>
      </div>
    </div>
  );
}
