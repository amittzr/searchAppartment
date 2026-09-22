// ============================================================
// JustPickLogo — Reusable brand mark component
// Displays the official JustPick icon from public/icons/
// Used on login, signup, onboarding, and the navbar.
// ============================================================

import Image from "next/image";

interface JustPickLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { px: 36, container: "w-9 h-9 rounded-xl" },
  md: { px: 56, container: "w-14 h-14 rounded-2xl" },
  lg: { px: 64, container: "w-16 h-16 rounded-2xl" },
};

export default function JustPickLogo({ size = "lg" }: JustPickLogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center justify-center ${s.container} overflow-hidden shadow-lg flex-shrink-0`}>
      <Image
        src="/icons/icon-192x192.png"
        alt="JustPick logo"
        width={s.px}
        height={s.px}
        className="w-full h-full object-cover"
        priority
      />
    </div>
  );
}
