// ============================================================
// PrivacyContent
// Single source of truth for the Privacy Policy text (includes GDPR-relevant
// disclosures and the AI processing notice).
// Rendered by both the /legal/privacy page and the signup pop-up (LegalModal).
// ============================================================

export const PRIVACY_LAST_UPDATED = "September 2026";

export default function PrivacyContent() {
  return (
    <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed">

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">1. Introduction</h2>
        <p>
          JustPick (&quot;we&quot;, &quot;our&quot;, &quot;the App&quot;) is committed to
          protecting your personal data. This Privacy Policy explains what data we collect,
          how we use it, and your rights under applicable privacy laws including GDPR.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">2. Data We Collect</h2>
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
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">3. How We Use Your Data</h2>
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
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">4. Data Storage & Security</h2>
        <p>
          All data is stored in a PostgreSQL database managed by{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            Supabase
          </a>{" "}
          on servers located in Singapore (ap-southeast-1). Data in transit is encrypted
          via TLS. Access is controlled by Row Level Security (RLS) policies that strictly
          isolate each Household&apos;s data from other groups.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
          5. Third-Party Data Services
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Supabase (Database & Auth)
            </h3>
            <p>
              User authentication and data storage are provided by Supabase Inc. Data is
              processed under their{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 dark:text-violet-400 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Vercel (Hosting)
            </h3>
            <p>
              The App is hosted on Vercel Inc. infrastructure. Basic request metadata may
              be processed by Vercel under their{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 dark:text-violet-400 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>

          {/* ── AI DISCLOSURE — required for GDPR transparency ── */}
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 dark:bg-violet-900/30 dark:border-violet-800">
            <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200 mb-2">
              🤖 AI Screenshot Processing (Google Gemini Vision API)
            </h3>
            <p className="text-sm text-violet-800 dark:text-violet-200">
              JustPick includes an optional &quot;Extract from Screenshot&quot; feature.
              When you choose to use this feature, the image you upload is transmitted
              to{" "}
              <strong>Google&apos;s Gemini Vision API</strong> solely for the purpose of
              extracting structured text data (such as price, address, and contact
              information) from the screenshot.
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-violet-800 dark:text-violet-200">
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
                  className="text-violet-700 dark:text-violet-300 underline"
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
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">6. Your Rights (GDPR)</h2>
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
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            admin@justpick.app
          </a>
          . We will respond within 30 days.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">7. Data Retention</h2>
        <p>
          Your data is retained as long as your account is active. When you delete your
          account, all personal data (profile, reactions, notes, push subscriptions) is
          permanently deleted within 30 days. Anonymized aggregate data (e.g., total item
          counts with no personal identifiers) may be retained for operational analytics.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">8. Cookies</h2>
        <p>
          JustPick uses only functional cookies to maintain your authentication session.
          These are httpOnly, secure cookies managed by Supabase Auth. We do not use
          tracking, advertising, or analytics cookies.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">9. Contact</h2>
        <p>
          For privacy-related enquiries, contact us at{" "}
          <a
            href="mailto:admin@justpick.app"
            className="text-violet-600 dark:text-violet-400 hover:underline"
          >
            admin@justpick.app
          </a>
          .
        </p>
      </section>
    </div>
  );
}
