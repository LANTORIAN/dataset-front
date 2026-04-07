import { cn } from "@/lib/utils";

interface MindLogoProps {
  className?: string;
}

export function MindLogo({ className }: MindLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <defs>
        <linearGradient id="mindGradient" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="url(#mindGradient)" opacity="0.16" />
      <path
        d="M22 19c-5 0-9 4-9 9 0 4 2 7 5 8.5-.2 1.3-.3 2.2-.3 2.5 0 5.4 4.4 9.8 9.8 9.8 2.8 0 5.4-1.2 7.2-3.1 1.8 1.9 4.4 3.1 7.2 3.1 5.4 0 9.8-4.4 9.8-9.8 0-.3-.1-1.2-.3-2.5 3-1.5 5-4.6 5-8.3 0-5.5-4.5-10-10-10-1.8 0-3.4.5-4.9 1.3-2-2.1-4.8-3.4-7.9-3.4-3.2 0-6 1.4-8 3.6A9.2 9.2 0 0 0 22 19Z"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="30" r="2.2" fill="currentColor" />
      <circle cx="39" cy="30" r="2.2" fill="currentColor" />
      <circle cx="32" cy="39" r="2.2" fill="currentColor" />
      <path
        d="M25 30h14M25 30l7 9M39 30l-7 9"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
