import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/backend-url";

const BACKEND = getBackendApiUrl();

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/system/ping`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
