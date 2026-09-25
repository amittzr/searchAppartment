"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ============================================================
// Terms of Service Page
// ============================================================

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using JustPick (&quot;the App&quot;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. Description of Service</h2>
            <p>
              JustPick is a private, collaborative tracking application designed for small groups
              (e.g., couples or partners) to jointly manage and evaluate listings such as
              apartments, venues, and vehicles. The App is not a public listing service and is
              not affiliated with any real-estate platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. User Accounts & Households</h2>
            <p>
              You must create an account to use JustPick. You are responsible for maintaining the
              confidentiality of your credentials. Each user belongs to one &quot;Household&quot;
              group. All data within a Household is shared among its members. You may leave or
              delete your Household at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. User-Generated Content</h2>
            <p>
              You retain ownership of the content you add to JustPick (notes, reactions,
              checklists). By submitting content, you grant JustPick a limited license to store
              and display that content within your Household. You are solely responsible for
              ensuring any content you upload (including third-party listing data) complies with
              applicable laws and the source platform&apos;s terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">5. Third-Party Content</h2>
            <p>
              JustPick allows users to import listing data from third-party platforms (such as
              Yad2 or Facebook Marketplace) for <strong>personal, private use only</strong>.
              This imported data must not be redistributed, published, or used for commercial
              purposes. JustPick is not affiliated with these platforms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">6. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>Use the App for any unlawful purpose</li>
              <li>Attempt to access other users&apos; Household data</li>
              <li>Reverse-engineer, scrape, or disrupt the App&apos;s infrastructure</li>
              <li>Upload content that violates third-party intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">7. Disclaimers</h2>
            <p>
              JustPick is provided &quot;as is&quot; without warranties of any kind. We do not
              guarantee the accuracy of scraped listing data. The App is a personal productivity
              tool and does not constitute real-estate or financial advice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, JustPick and its creators shall not be
              liable for any indirect, incidental, or consequential damages arising from your use
              of the App.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">9. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. Continued use of the App
              after changes constitutes acceptance of the new Terms. We will notify users of
              material changes via the App.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
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
