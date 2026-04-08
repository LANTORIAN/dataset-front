import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/backend-url";

const BACKEND = getBackendApiUrl();

export async function GET() {
  try {
    // HEAD sur n'importe quel endpoint — toute réponse HTTP = backend up
    await fetch(`${BACKEND}/auth/login`, {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
