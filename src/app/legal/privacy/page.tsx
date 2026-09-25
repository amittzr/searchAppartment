"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ============================================================
// Privacy Policy Page
// Includes GDPR-relevant disclosures and AI processing notice.
// ============================================================

export default function PrivacyPage() {
  const lastUpdated = "September 2026";

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky back bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to JustPick
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Introduction</h2>
            <p>
              JustPick (&quot;we&quot;, &quot;our&quot;, &quot;the App&quot;) is committed to
              protecting your personal data. This Privacy Policy explains what data we collect,
              how we use it, and your rights under applicable privacy laws including GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. Data We Collect</h2>
            <p>We collect the following categories of data:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>
                <strong>Account data:</strong> Email address and display name provided at
                registration.
              </li>
              <li>
                <strong>Household data:</strong> The name of your household group, category
                preference, and invite code.
              </li>
              <li>
                <strong>Listing data:</strong> Property/item information you add manually or
                import via third-party URLs (title, price, phone numbers, images, notes).
              </li>
              <li>
                <strong>Reaction data:</strong> Your reactions (&quot;Liked&quot;,
                &quot;Review&quot;, &quot;Rejected&quot;) to shared items.
              </li>
              <li>
                <strong>Push notification tokens:</strong> Browser push subscription objects
                stored to deliver notifications to your device.
              </li>
              <li>
                <strong>Usage data:</strong> Basic server logs (IP address, request timestamps)
                retained for security and debugging.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. How We Use Your Data</h2>
            <p>Your data is used exclusively to:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Authenticate your identity and maintain your session</li>
              <li>Display and synchronize listing data within your Household</li>
              <li>Send push notifications about new items, matches, and reminders</li>
              <li>Enable the collaborative features of the App</li>
            </ul>
            <p className="mt-2">
              We do <strong>not</strong> sell, share, or use your data for advertising or
              any commercial purpose unrelated to operating the App.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. Data Storage & Security</h2>
            <p>
              All data is stored in a PostgreSQL database managed by{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline"
              >
                Supabase
              </a>{" "}
              on servers located in Singapore (ap-southeast-1). Data in transit is encrypted
              via TLS. Access is controlled by Row Level Security (RLS) policies that strictly
              isolate each Household&apos;s data from other groups.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              5. Third-Party Data Services
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Supabase (Database & Auth)
                </h3>
                <p>
                  User authentication and data storage are provided by Supabase Inc. Data is
                  processed under their{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  Vercel (Hosting)
                </h3>
                <p>
                  The App is hosted on Vercel Inc. infrastructure. Basic request metadata may
                  be processed by Vercel under their{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              {/* ── AI DISCLOSURE — required for GDPR transparency ── */}
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                <h3 className="text-sm font-semibold text-violet-900 mb-2">
                  🤖 AI Screenshot Processing (Google Gemini Vision API)
                </h3>
                <p className="text-sm text-violet-800">
                  JustPick includes an optional &quot;Extract from Screenshot&quot; feature.
                  When you choose to use this feature, the image you upload is transmitted
                  to{" "}
                  <strong>Google&apos;s Gemini Vision API</strong> solely for the purpose of
                  extracting structured text data (such as price, address, and contact
                  information) from the screenshot.
                </p>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-violet-800">
                  <li>
                    Images are sent to Google&apos;s servers for processing and are{" "}
                    <strong>not stored</strong> by JustPick after extraction.
                  </li>
                  <li>
                    Google may process this data under their{" "}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-700 underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </li>
                  <li>
                    This feature is entirely <strong>opt-in</strong>. You can add listings
                    manually or via URL without using AI screenshot extraction.
                  </li>
                  <li>
                    Do not upload screenshots containing sensitive personal information
                    beyond what is needed for listing extraction.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">6. Your Rights (GDPR)</h2>
            <p>If you are located in the European Economic Area, you have the right to:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>
                <strong>Access</strong> — request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Rectification</strong> — correct inaccurate data in your profile.
              </li>
              <li>
                <strong>Erasure</strong> — delete your account and all associated data via
                Settings → &quot;Delete My Account&amp; Data&quot;.
              </li>
              <li>
                <strong>Portability</strong> — request your data in a machine-readable format.
              </li>
              <li>
                <strong>Objection</strong> — object to processing for any purpose beyond App
                operation.
              </li>
            </ul>
            <p className="mt-2">
              To exercise any right, contact us at{" "}
              <a
                href="mailto:admin@justpick.app"
                className="text-violet-600 hover:underline"
              >
                admin@justpick.app
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">7. Data Retention</h2>
            <p>
              Your data is retained as long as your account is active. When you delete your
              account, all personal data (profile, reactions, notes, push subscriptions) is
              permanently deleted within 30 days. Anonymized aggregate data (e.g., total item
              counts with no personal identifiers) may be retained for operational analytics.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">8. Cookies</h2>
            <p>
              JustPick uses only functional cookies to maintain your authentication session.
              These are httpOnly, secure cookies managed by Supabase Auth. We do not use
              tracking, advertising, or analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">9. Contact</h2>
            <p>
              For privacy-related enquiries, contact us at{" "}
              <a
                href="mailto:admin@justpick.app"
                className="text-violet-600 hover:underline"
              >
                admin@justpick.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
