"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Key } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [invitePassword, setInvitePassword] = useState(""); // App password gate
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateForm = (): string | null => {
    if (!invitePassword.trim()) return "Please enter the invite password";
    if (invitePassword !== process.env.NEXT_PUBLIC_APP_PASSWORD) return "Invalid invite password";
    if (!fullName.trim()) return "Please enter your name";
    if (!email.trim()) return "Please enter your email";
    if (!password) return "Please enter a password";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          setError("This email is already registered. Please sign in instead.");
          return;
        }

        if (data.session) {
          // Auto-confirmed - redirect to onboarding
          router.replace("/onboarding");
          router.refresh();
        } else {
          // Email confirmation required
          setSuccess(true);
        }
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Check your email</h2>
                <p className="text-sm text-slate-500 mt-2">
                  We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>. 
                  Click the link to activate your account.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
            <Home className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">GroupPick</h1>
            <p className="text-sm text-slate-500 mt-1">Decide together, pick the best</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5 text-center">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Invite password field */}
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => {
                  setInvitePassword(e.target.value);
                  setError(null);
                }}
                placeholder="Invite password (ask the admin)"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
              />
            </div>

            {/* Full name field */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError(null);
                }}
                placeholder="Full name"
                autoComplete="name"
                autoFocus
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
              />
            </div>

            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Email address"
                autoComplete="email"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password (min 6 characters)"
                autoComplete="new-password"
                className="w-full px-4 py-3 pl-10 pr-11 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
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

            {/* Confirm password field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors hover:border-slate-300"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-brand-800 active:scale-95 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>

            {/* Sign in link */}
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="text-brand-600 hover:text-brand-700 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
