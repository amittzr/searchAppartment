import type { Metadata } from "next";
import DemoDashboard from "@/components/DemoDashboard";

// The root layout marks the app as noindex because it is private.
// The demo is public marketing content, so it opts back in.
export const metadata: Metadata = {
  title: "JustPick Demo - Decide on your next apartment together",
  description:
    "Try JustPick with sample apartments: swipe through photos, check the viewing checklist and see how partners match. No account needed.",
  robots: { index: true, follow: true },
};

export default function DemoPage() {
  return <DemoDashboard />;
}
